import {
  createGrantOperationKey,
  createWithdrawalOperationKey,
} from "../crypto/marketing-consent-operation-key";
import type { D1DatabasePort, D1ResultPort } from "../runtime-ports";

export const MARKETING_CONSENT_VERSION = "marketing-consent-v1.0.0" as const;
export const MARKETING_CONSENT_VERSION_SEQUENCE = 1 as const;
export const MARKETING_CONSENT_SOURCE_CONTEXT =
  "generator_email_download_gate" as const;
export const MARKETING_CONSENT_RETENTION_MS = 63_072_000_000 as const;

export type MarketingConsentGrantResult =
  "grant_persisted" | "already_active" | "verification_authority_invalid";

export type MarketingConsentWithdrawalResult =
  | "withdrawn"
  | "already_withdrawn"
  | "not_active"
  | "verification_authority_invalid";

interface MarketingConsentAuthorityInput {
  readonly canonicalEmail: string;
  readonly challengeId: string;
  readonly challengeCreatedAt: number;
  readonly challengeVerifiedAt: number;
  readonly eventId: string;
  readonly timestamp: number;
}

export interface MarketingConsentGrantInput extends MarketingConsentAuthorityInput {
  readonly subscriptionId: string;
}

export type MarketingConsentWithdrawalInput = MarketingConsentAuthorityInput;

export interface MarketingConsentRepository {
  grant(
    input: MarketingConsentGrantInput,
  ): Promise<MarketingConsentGrantResult>;
  withdraw(
    input: MarketingConsentWithdrawalInput,
  ): Promise<MarketingConsentWithdrawalResult>;
}

interface ClassificationRow<Result extends string> {
  readonly result: Result;
}

export function createMarketingConsentRepository(
  db: D1DatabasePort,
): MarketingConsentRepository {
  return Object.freeze({
    async grant(
      input: MarketingConsentGrantInput,
    ): Promise<MarketingConsentGrantResult> {
      if (!hasValidAuthorityTimeline(input)) {
        return "verification_authority_invalid";
      }

      const operationKey = await createGrantOperationKey(
        input.challengeId,
        MARKETING_CONSENT_VERSION,
      );
      const results = await db.batch<
        ClassificationRow<MarketingConsentGrantResult>
      >([
        db
          .prepare(
            `INSERT INTO marketing_subscriptions (
               subscription_id, canonical_email, status, consent_version,
               consent_version_sequence, consent_source_context,
               consent_timestamp, withdrawn_timestamp, retention_delete_after,
               state_version, last_transition_operation_key, created_at,
               updated_at
             )
             SELECT ?, ?, 'active', ?, ?, ?, ?, NULL, NULL, 1, ?, ?, ?
             WHERE NOT EXISTS (
               SELECT 1 FROM marketing_consent_events WHERE operation_key = ?
             )
             ON CONFLICT(canonical_email) DO UPDATE SET
               status = 'active',
               consent_version = excluded.consent_version,
               consent_version_sequence = excluded.consent_version_sequence,
               consent_source_context = excluded.consent_source_context,
               consent_timestamp = excluded.consent_timestamp,
               withdrawn_timestamp = NULL,
               retention_delete_after = NULL,
               state_version = marketing_subscriptions.state_version + 1,
               last_transition_operation_key =
                 excluded.last_transition_operation_key,
               updated_at = excluded.updated_at
             WHERE marketing_subscriptions.status = 'withdrawn'
               AND ? > marketing_subscriptions.withdrawn_timestamp
               AND ? > marketing_subscriptions.withdrawn_timestamp
               AND excluded.consent_timestamp >= ?
               AND excluded.consent_timestamp > marketing_subscriptions.updated_at
               AND excluded.consent_version_sequence >=
                 marketing_subscriptions.consent_version_sequence`,
          )
          .bind(
            input.subscriptionId,
            input.canonicalEmail,
            MARKETING_CONSENT_VERSION,
            MARKETING_CONSENT_VERSION_SEQUENCE,
            MARKETING_CONSENT_SOURCE_CONTEXT,
            input.timestamp,
            operationKey,
            input.timestamp,
            input.timestamp,
            operationKey,
            input.challengeCreatedAt,
            input.challengeVerifiedAt,
            input.challengeVerifiedAt,
          ),
        db
          .prepare(
            `INSERT INTO marketing_consent_events (
               event_id, subscription_id, subscription_state_version,
               operation_key, event_type, consent_version,
               consent_version_sequence, source_context, event_timestamp
             )
             SELECT ?, subscription_id, state_version, ?, 'granted', ?, ?, ?, ?
             FROM marketing_subscriptions
             WHERE canonical_email = ? AND status = 'active'
               AND last_transition_operation_key = ?
             ON CONFLICT(operation_key) DO NOTHING`,
          )
          .bind(
            input.eventId,
            operationKey,
            MARKETING_CONSENT_VERSION,
            MARKETING_CONSENT_VERSION_SEQUENCE,
            MARKETING_CONSENT_SOURCE_CONTEXT,
            input.timestamp,
            input.canonicalEmail,
            operationKey,
          ),
        db
          .prepare(
            `SELECT CASE
               WHEN status = 'withdrawn'
                 AND (
                   ? <= withdrawn_timestamp OR ? <= withdrawn_timestamp
                 )
                 THEN 'verification_authority_invalid'
               WHEN EXISTS (
                 SELECT 1 FROM marketing_consent_events AS events
                 WHERE events.subscription_id = subscriptions.subscription_id
                   AND events.operation_key = ?
                   AND events.event_type = 'granted'
               )
                 THEN 'grant_persisted'
               WHEN status = 'active'
                 THEN 'already_active'
               ELSE 'verification_authority_invalid'
             END AS result
             FROM marketing_subscriptions AS subscriptions
             WHERE canonical_email = ?`,
          )
          .bind(
            input.challengeCreatedAt,
            input.challengeVerifiedAt,
            operationKey,
            input.canonicalEmail,
          ),
      ]);

      return requireClassification(results, 2, "grant");
    },

    async withdraw(
      input: MarketingConsentWithdrawalInput,
    ): Promise<MarketingConsentWithdrawalResult> {
      if (!hasValidAuthorityTimeline(input, MARKETING_CONSENT_RETENTION_MS)) {
        return "verification_authority_invalid";
      }

      const operationKey = await createWithdrawalOperationKey(
        input.challengeId,
      );
      const results = await db.batch<
        ClassificationRow<MarketingConsentWithdrawalResult>
      >([
        db
          .prepare(
            `UPDATE marketing_subscriptions
             SET status = 'withdrawn',
                 withdrawn_timestamp = ?,
                 retention_delete_after = ? + ?,
                 state_version = state_version + 1,
                 last_transition_operation_key = ?,
                 updated_at = ?
             WHERE canonical_email = ? AND status = 'active'
               AND ? > consent_timestamp
               AND ? > consent_timestamp
               AND ? >= ?
               AND ? > updated_at
               AND NOT EXISTS (
                 SELECT 1 FROM marketing_consent_events WHERE operation_key = ?
               )`,
          )
          .bind(
            input.timestamp,
            input.timestamp,
            MARKETING_CONSENT_RETENTION_MS,
            operationKey,
            input.timestamp,
            input.canonicalEmail,
            input.challengeCreatedAt,
            input.challengeVerifiedAt,
            input.timestamp,
            input.challengeVerifiedAt,
            input.timestamp,
            operationKey,
          ),
        db
          .prepare(
            `INSERT INTO marketing_consent_events (
               event_id, subscription_id, subscription_state_version,
               operation_key, event_type, consent_version,
               consent_version_sequence, source_context, event_timestamp
             )
             SELECT ?, subscription_id, state_version, ?, 'withdrawn',
                    consent_version, consent_version_sequence, ?, ?
             FROM marketing_subscriptions
             WHERE canonical_email = ? AND status = 'withdrawn'
               AND last_transition_operation_key = ?
             ON CONFLICT(operation_key) DO NOTHING`,
          )
          .bind(
            input.eventId,
            operationKey,
            MARKETING_CONSENT_SOURCE_CONTEXT,
            input.timestamp,
            input.canonicalEmail,
            operationKey,
          ),
        db
          .prepare(
            `SELECT CASE
               WHEN status = 'active'
                 THEN 'verification_authority_invalid'
               WHEN EXISTS (
                 SELECT 1 FROM marketing_consent_events AS events
                 WHERE events.subscription_id = subscriptions.subscription_id
                   AND events.operation_key = ?
                   AND events.event_type = 'withdrawn'
               )
                 THEN 'withdrawn'
               WHEN status = 'withdrawn'
                 THEN 'already_withdrawn'
               ELSE 'not_active'
             END AS result
             FROM marketing_subscriptions AS subscriptions
             WHERE canonical_email = ?`,
          )
          .bind(operationKey, input.canonicalEmail),
      ]);

      return classification(results, 2)?.result ?? "not_active";
    },
  });
}

function hasValidAuthorityTimeline(
  input: MarketingConsentAuthorityInput,
  requiredFutureRange = 0,
): boolean {
  const timestamps = [
    input.challengeCreatedAt,
    input.challengeVerifiedAt,
    input.timestamp,
  ];
  return (
    timestamps.every(
      (timestamp) => Number.isSafeInteger(timestamp) && timestamp >= 0,
    ) &&
    input.challengeVerifiedAt >= input.challengeCreatedAt &&
    input.timestamp >= input.challengeVerifiedAt &&
    input.timestamp <= Number.MAX_SAFE_INTEGER - requiredFutureRange
  );
}

function requireClassification<Result extends string>(
  results: readonly D1ResultPort<ClassificationRow<Result>>[],
  index: number,
  operation: string,
): Result {
  const row = classification(results, index);
  if (row === null) {
    throw new Error(`MARKETING_CONSENT_${operation.toUpperCase()}_INVARIANT`);
  }
  return row.result;
}

function classification<Result extends string>(
  results: readonly D1ResultPort<ClassificationRow<Result>>[],
  index: number,
): ClassificationRow<Result> | null {
  return results[index]?.results?.[0] ?? null;
}
