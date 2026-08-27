import {
  EMAIL_GATE_AGGREGATE_SCHEMA_VERSION,
  EMAIL_GATE_GLOBAL_RESERVATION_LIMIT,
  EMAIL_GATE_RECONCILIATION_VERSION,
  EMAIL_GATE_RESERVATION_MS,
  EMAIL_GATE_RETENTION_MS,
  type EmailGateChallengeRow,
  type EmailGateChallengeState,
  toUtcAggregateDate,
} from "../model";
import type { D1DatabasePort, D1PreparedStatementPort } from "../runtime-ports";

interface ChallengeDbRow {
  challengeId: string;
  normalizedEmail: string;
  state: EmailGateChallengeState;
  otpKeyVersion: number;
  providerSendEventId: string;
  deliveryPayloadVersion: number;
  providerAttemptCount: number;
  providerAttemptLeaseUntil: number | null;
  attemptCount: number;
  predecessorChallengeId: string | null;
  createdAt: number;
  expiresAt: number;
  activatedAt: number | null;
  verifiedAt: number | null;
  terminalAt: number | null;
  lastProviderAttemptAt: number | null;
  reconciledAt: number | null;
  reconciliationVersion: number | null;
  deletionEligibleAt: number | null;
  rowVersion: number;
}

export interface NewPendingChallengeInput {
  readonly challengeId: string;
  readonly normalizedEmail: string;
  readonly otpKeyVersion: number;
  readonly providerSendEventId: string;
  readonly deliveryPayloadVersion: number;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export interface EmailGateRepository {
  settleIneligiblePending(normalizedEmail: string, now: number): Promise<void>;
  findPendingByEmail(
    normalizedEmail: string,
  ): Promise<EmailGateChallengeRow | null>;
  createNewPending(
    input: NewPendingChallengeInput,
  ): Promise<EmailGateChallengeRow | null>;
  reserveProviderAttempt(
    challengeId: string,
    now: number,
    leaseUntil: number,
  ): Promise<EmailGateChallengeRow | null>;
  activatePending(
    challengeId: string,
    normalizedEmail: string,
    now: number,
  ): Promise<boolean>;
  markDeliveryFailed(challengeId: string, now: number): Promise<boolean>;
  findChallenge(challengeId: string): Promise<EmailGateChallengeRow | null>;
  expireChallenge(challengeId: string, now: number): Promise<boolean>;
  verifyActive(
    challengeId: string,
    expectedRowVersion: number,
    now: number,
  ): Promise<boolean>;
  recordWrongAttempt(
    challengeId: string,
    expectedRowVersion: number,
    expectedAttemptCount: number,
    now: number,
  ): Promise<EmailGateChallengeRow | null>;
  reconcileAndCleanup(now: number, challengeLimit?: number): Promise<number>;
}

export function createEmailGateRepository(
  db: D1DatabasePort,
): EmailGateRepository {
  return Object.freeze({
    async settleIneligiblePending(
      normalizedEmail: string,
      now: number,
    ): Promise<void> {
      await db.batch([
        db
          .prepare(
            `UPDATE email_gate_challenges
             SET state = 'expired', terminal_at = expires_at,
                 deletion_eligible_at = expires_at + ?, row_version = row_version + 1
             WHERE normalized_email = ? AND state = 'delivery_pending'
               AND expires_at <= ?`,
          )
          .bind(EMAIL_GATE_RETENTION_MS, normalizedEmail, now),
        db
          .prepare(
            `UPDATE email_gate_challenges
             SET state = 'delivery_failed', terminal_at = ?,
                 deletion_eligible_at = ? + ?, row_version = row_version + 1
             WHERE normalized_email = ? AND state = 'delivery_pending'
               AND provider_attempt_count >= 3
               AND (provider_attempt_lease_until IS NULL OR provider_attempt_lease_until <= ?)`,
          )
          .bind(now, now, EMAIL_GATE_RETENTION_MS, normalizedEmail, now),
      ]);
    },

    async findPendingByEmail(
      normalizedEmail: string,
    ): Promise<EmailGateChallengeRow | null> {
      return readChallenge(
        db
          .prepare(
            `${SELECT_CHALLENGE}
             WHERE normalized_email = ? AND state = 'delivery_pending'`,
          )
          .bind(normalizedEmail),
      );
    },

    async createNewPending(
      input: NewPendingChallengeInput,
    ): Promise<EmailGateChallengeRow | null> {
      const reservationExpiry = input.createdAt + EMAIL_GATE_RESERVATION_MS;
      const statements = [
        db
          .prepare(
            `INSERT INTO email_gate_send_reservations (
               provider_send_event_id, reserved_at, expires_at
             )
             SELECT ?, ?, ?
             WHERE (
               SELECT COUNT(*) FROM email_gate_send_reservations
               WHERE reserved_at <= ? AND expires_at > ?
             ) < ?`,
          )
          .bind(
            input.providerSendEventId,
            input.createdAt,
            reservationExpiry,
            input.createdAt,
            input.createdAt,
            EMAIL_GATE_GLOBAL_RESERVATION_LIMIT,
          ),
        db
          .prepare(
            `INSERT INTO email_gate_challenges (
               challenge_id, normalized_email, state, otp_key_version,
               provider_send_event_id, delivery_payload_version,
               predecessor_challenge_id, created_at, expires_at
             )
             SELECT ?, ?, 'delivery_pending', ?, ?, ?,
                    (SELECT challenge_id FROM email_gate_challenges
                     WHERE normalized_email = ? AND state = 'active'),
                    ?, ?
             WHERE EXISTS (
               SELECT 1 FROM email_gate_send_reservations
               WHERE provider_send_event_id = ?
             )
             AND NOT EXISTS (
               SELECT 1 FROM email_gate_challenges
               WHERE normalized_email = ? AND state = 'delivery_pending'
             )
             AND NOT EXISTS (
               SELECT 1 FROM email_gate_challenges
               WHERE normalized_email = ? AND created_at > ?
             )
             AND (
               SELECT COUNT(*) FROM email_gate_challenges
               WHERE normalized_email = ? AND created_at > ?
             ) < 3
             AND (
               SELECT COUNT(*) FROM email_gate_challenges
               WHERE normalized_email = ? AND created_at > ?
             ) < 6`,
          )
          .bind(
            input.challengeId,
            input.normalizedEmail,
            input.otpKeyVersion,
            input.providerSendEventId,
            input.deliveryPayloadVersion,
            input.normalizedEmail,
            input.createdAt,
            input.expiresAt,
            input.providerSendEventId,
            input.normalizedEmail,
            input.normalizedEmail,
            input.createdAt - 60_000,
            input.normalizedEmail,
            input.createdAt - 1_800_000,
            input.normalizedEmail,
            input.createdAt - 86_400_000,
          ),
        // If the conditional challenge insert did not occur, deliberately
        // violate the reservation PK so D1 batch rolls both inserts back.
        db
          .prepare(
            `INSERT INTO email_gate_send_reservations (
               provider_send_event_id, reserved_at, expires_at
             )
             SELECT provider_send_event_id, reserved_at, expires_at
             FROM email_gate_send_reservations
             WHERE provider_send_event_id = ?
               AND NOT EXISTS (
                 SELECT 1 FROM email_gate_challenges WHERE challenge_id = ?
               )`,
          )
          .bind(input.providerSendEventId, input.challengeId),
      ];

      try {
        await db.batch(statements);
      } catch {
        return null;
      }
      return this.findChallenge(input.challengeId);
    },

    async reserveProviderAttempt(
      challengeId: string,
      now: number,
      leaseUntil: number,
    ): Promise<EmailGateChallengeRow | null> {
      return readChallenge(
        db
          .prepare(
            `UPDATE email_gate_challenges
             SET provider_attempt_count = provider_attempt_count + 1,
                 last_provider_attempt_at = ?, provider_attempt_lease_until = ?,
                 row_version = row_version + 1
             WHERE challenge_id = ? AND state = 'delivery_pending'
               AND expires_at > ? AND provider_attempt_count < 3
               AND (
                 provider_attempt_lease_until IS NULL OR
                 provider_attempt_lease_until <= ?
               )
             RETURNING ${CHALLENGE_COLUMNS}`,
          )
          .bind(now, leaseUntil, challengeId, now, now),
      );
    },

    async activatePending(
      challengeId: string,
      normalizedEmail: string,
      now: number,
    ): Promise<boolean> {
      try {
        const results = await db.batch([
          db
            .prepare(
              `UPDATE email_gate_challenges
               SET state = CASE
                     WHEN expires_at <= ? THEN 'expired'
                     ELSE 'superseded'
                   END,
                   terminal_at = MIN(expires_at, ?),
                   deletion_eligible_at = MIN(expires_at, ?) + ?,
                   row_version = row_version + 1
               WHERE normalized_email = ? AND state = 'active'
                 AND EXISTS (
                   SELECT 1 FROM email_gate_challenges AS pending
                   WHERE pending.challenge_id = ?
                     AND pending.normalized_email = ?
                     AND pending.state = 'delivery_pending'
                     AND pending.expires_at > ?
                 )`,
            )
            .bind(
              now,
              now,
              now,
              EMAIL_GATE_RETENTION_MS,
              normalizedEmail,
              challengeId,
              normalizedEmail,
              now,
            ),
          db
            .prepare(
              `UPDATE email_gate_challenges
               SET state = 'active', activated_at = ?, terminal_at = NULL,
                   deletion_eligible_at = NULL,
                   provider_attempt_lease_until = NULL,
                   row_version = row_version + 1
               WHERE challenge_id = ? AND normalized_email = ?
                 AND state = 'delivery_pending' AND expires_at > ?`,
            )
            .bind(now, challengeId, normalizedEmail, now),
          db
            .prepare(
              `INSERT INTO email_gate_send_reservations (
                 provider_send_event_id, reserved_at, expires_at
               )
               SELECT reservation.provider_send_event_id,
                      reservation.reserved_at,
                      reservation.expires_at
               FROM email_gate_send_reservations AS reservation
               JOIN email_gate_challenges AS challenge
                 ON challenge.provider_send_event_id = reservation.provider_send_event_id
               WHERE challenge.challenge_id = ? AND challenge.state <> 'active'`,
            )
            .bind(challengeId),
        ]);
        return (results[1]?.meta.changes ?? 0) === 1;
      } catch {
        return false;
      }
    },

    async markDeliveryFailed(
      challengeId: string,
      now: number,
    ): Promise<boolean> {
      const result = await db
        .prepare(
          `UPDATE email_gate_challenges
           SET state = 'delivery_failed', terminal_at = ?,
               deletion_eligible_at = ? + ?, provider_attempt_lease_until = NULL,
               row_version = row_version + 1
           WHERE challenge_id = ? AND state = 'delivery_pending'
             AND expires_at > ?`,
        )
        .bind(now, now, EMAIL_GATE_RETENTION_MS, challengeId, now)
        .run();
      return (result.meta.changes ?? 0) === 1;
    },

    async findChallenge(
      challengeId: string,
    ): Promise<EmailGateChallengeRow | null> {
      return readChallenge(
        db
          .prepare(`${SELECT_CHALLENGE} WHERE challenge_id = ?`)
          .bind(challengeId),
      );
    },

    async expireChallenge(challengeId: string, now: number): Promise<boolean> {
      const result = await db
        .prepare(
          `UPDATE email_gate_challenges
           SET state = 'expired', terminal_at = expires_at,
               deletion_eligible_at = expires_at + ?, row_version = row_version + 1
           WHERE challenge_id = ? AND state IN ('active', 'delivery_pending')
             AND expires_at <= ?`,
        )
        .bind(EMAIL_GATE_RETENTION_MS, challengeId, now)
        .run();
      return (result.meta.changes ?? 0) === 1;
    },

    async verifyActive(
      challengeId: string,
      expectedRowVersion: number,
      now: number,
    ): Promise<boolean> {
      const result = await db
        .prepare(
          `UPDATE email_gate_challenges
           SET state = 'verified', verified_at = ?, terminal_at = ?,
               deletion_eligible_at = ? + ?, row_version = row_version + 1
           WHERE challenge_id = ? AND state = 'active' AND expires_at > ?
             AND row_version = ?`,
        )
        .bind(
          now,
          now,
          now,
          EMAIL_GATE_RETENTION_MS,
          challengeId,
          now,
          expectedRowVersion,
        )
        .run();
      return (result.meta.changes ?? 0) === 1;
    },

    async recordWrongAttempt(
      challengeId: string,
      expectedRowVersion: number,
      expectedAttemptCount: number,
      now: number,
    ): Promise<EmailGateChallengeRow | null> {
      return readChallenge(
        db
          .prepare(
            `UPDATE email_gate_challenges
             SET attempt_count = attempt_count + 1,
                 state = CASE
                   WHEN attempt_count + 1 >= 5 THEN 'terminal_failed'
                   ELSE 'active'
                 END,
                 terminal_at = CASE
                   WHEN attempt_count + 1 >= 5 THEN ? ELSE NULL
                 END,
                 deletion_eligible_at = CASE
                   WHEN attempt_count + 1 >= 5 THEN ? + ? ELSE NULL
                 END,
                 row_version = row_version + 1
             WHERE challenge_id = ? AND state = 'active' AND expires_at > ?
               AND row_version = ? AND attempt_count = ?
             RETURNING ${CHALLENGE_COLUMNS}`,
          )
          .bind(
            now,
            now,
            EMAIL_GATE_RETENTION_MS,
            challengeId,
            now,
            expectedRowVersion,
            expectedAttemptCount,
          ),
      );
    },

    async reconcileAndCleanup(
      now: number,
      challengeLimit = 25,
    ): Promise<number> {
      const candidates = await db
        .prepare(
          `${SELECT_CHALLENGE}
           WHERE
             (state IN ('active', 'delivery_pending') AND expires_at <= ?)
             OR (terminal_at IS NOT NULL AND reconciled_at IS NULL)
             OR (
               reconciled_at IS NOT NULL AND deletion_eligible_at IS NOT NULL
               AND deletion_eligible_at <= ?
             )
           ORDER BY COALESCE(terminal_at, expires_at), created_at
           LIMIT ?`,
        )
        .bind(now, now, Math.min(25, Math.max(0, challengeLimit)))
        .all<ChallengeDbRow>();

      let processed = 0;
      for (const candidate of candidates.results) {
        let row = toChallenge(candidate);
        if (
          (row.state === "active" || row.state === "delivery_pending") &&
          row.expiresAt <= now
        ) {
          await this.expireChallenge(row.challengeId, now);
          const reread = await this.findChallenge(row.challengeId);
          if (reread === null) continue;
          row = reread;
        }
        if (row.terminalAt !== null && row.reconciledAt === null) {
          await reconcileChallenge(db, row, now);
          const reread = await this.findChallenge(row.challengeId);
          if (reread === null) continue;
          row = reread;
        }
        if (
          row.reconciledAt !== null &&
          row.deletionEligibleAt !== null &&
          row.deletionEligibleAt <= now
        ) {
          await db
            .prepare(
              `DELETE FROM email_gate_challenges
               WHERE challenge_id = ? AND reconciled_at IS NOT NULL
                 AND deletion_eligible_at <= ?`,
            )
            .bind(row.challengeId, now)
            .run();
        }
        processed += 1;
      }

      await db
        .prepare(
          `DELETE FROM email_gate_send_reservations
           WHERE provider_send_event_id IN (
             SELECT provider_send_event_id
             FROM email_gate_send_reservations
             WHERE expires_at <= ?
             ORDER BY expires_at
             LIMIT 25
           )`,
        )
        .bind(now)
        .run();
      return processed;
    },
  });
}

const CHALLENGE_COLUMNS = `
  challenge_id AS challengeId,
  normalized_email AS normalizedEmail,
  state,
  otp_key_version AS otpKeyVersion,
  provider_send_event_id AS providerSendEventId,
  delivery_payload_version AS deliveryPayloadVersion,
  provider_attempt_count AS providerAttemptCount,
  provider_attempt_lease_until AS providerAttemptLeaseUntil,
  attempt_count AS attemptCount,
  predecessor_challenge_id AS predecessorChallengeId,
  created_at AS createdAt,
  expires_at AS expiresAt,
  activated_at AS activatedAt,
  verified_at AS verifiedAt,
  terminal_at AS terminalAt,
  last_provider_attempt_at AS lastProviderAttemptAt,
  reconciled_at AS reconciledAt,
  reconciliation_version AS reconciliationVersion,
  deletion_eligible_at AS deletionEligibleAt,
  row_version AS rowVersion`;

const SELECT_CHALLENGE = `SELECT ${CHALLENGE_COLUMNS} FROM email_gate_challenges`;

async function readChallenge(
  statement: D1PreparedStatementPort,
): Promise<EmailGateChallengeRow | null> {
  const row = await statement.first<ChallengeDbRow>();
  return row === null ? null : toChallenge(row);
}

function toChallenge(row: ChallengeDbRow): EmailGateChallengeRow {
  return Object.freeze({ ...row });
}

async function reconcileChallenge(
  db: D1DatabasePort,
  challenge: EmailGateChallengeRow,
  now: number,
): Promise<void> {
  if (challenge.terminalAt === null) return;
  const issuedDate = toUtcAggregateDate(challenge.createdAt);
  const terminalDate = toUtcAggregateDate(challenge.terminalAt);
  const issuedOnly = aggregateDelta(challenge, false);
  const terminalOnly = aggregateDelta(challenge, true);
  const statements: D1PreparedStatementPort[] = [];

  if (issuedDate === terminalDate) {
    statements.push(
      aggregateUpsert(db, challenge.challengeId, issuedDate, {
        ...issuedOnly,
        verificationSuccesses: terminalOnly.verificationSuccesses,
        verificationInvalidAttempts: terminalOnly.verificationInvalidAttempts,
        verificationLocked: terminalOnly.verificationLocked,
        verificationExpired: terminalOnly.verificationExpired,
        deliveryFailures: terminalOnly.deliveryFailures,
      }),
    );
  } else {
    statements.push(
      aggregateUpsert(db, challenge.challengeId, issuedDate, issuedOnly),
    );
    statements.push(
      aggregateUpsert(db, challenge.challengeId, terminalDate, terminalOnly),
    );
  }

  statements.push(
    db
      .prepare(
        `UPDATE email_gate_challenges
         SET reconciled_at = ?, reconciliation_version = ?,
             row_version = row_version + 1
         WHERE challenge_id = ? AND terminal_at IS NOT NULL
           AND reconciled_at IS NULL`,
      )
      .bind(now, EMAIL_GATE_RECONCILIATION_VERSION, challenge.challengeId),
  );
  // Marker failure must roll aggregate writes back. If the row is still
  // unreconciled, this self-copy deliberately violates the challenge PK.
  statements.push(
    db
      .prepare(
        `INSERT INTO email_gate_challenges (
           challenge_id, normalized_email, state, otp_key_version,
           provider_send_event_id, delivery_payload_version,
           provider_attempt_count, provider_attempt_lease_until, attempt_count,
           predecessor_challenge_id, created_at, expires_at, activated_at,
           verified_at, terminal_at, last_provider_attempt_at, reconciled_at,
           reconciliation_version, deletion_eligible_at, row_version
         )
         SELECT challenge_id, normalized_email, state, otp_key_version,
                provider_send_event_id, delivery_payload_version,
                provider_attempt_count, provider_attempt_lease_until,
                attempt_count, predecessor_challenge_id, created_at, expires_at,
                activated_at, verified_at, terminal_at, last_provider_attempt_at,
                reconciled_at, reconciliation_version, deletion_eligible_at,
                row_version
         FROM email_gate_challenges
         WHERE challenge_id = ? AND reconciled_at IS NULL`,
      )
      .bind(challenge.challengeId),
  );
  await db.batch(statements);
}

interface AggregateDelta {
  readonly challengesIssued: number;
  readonly verificationSuccesses: number;
  readonly verificationInvalidAttempts: number;
  readonly verificationLocked: number;
  readonly verificationExpired: number;
  readonly deliveryFailures: number;
}

function aggregateDelta(
  challenge: EmailGateChallengeRow,
  terminal: boolean,
): AggregateDelta {
  return Object.freeze({
    challengesIssued: terminal ? 0 : 1,
    verificationSuccesses: terminal && challenge.state === "verified" ? 1 : 0,
    verificationInvalidAttempts: terminal ? challenge.attemptCount : 0,
    verificationLocked:
      terminal && challenge.state === "terminal_failed" ? 1 : 0,
    verificationExpired: terminal && challenge.state === "expired" ? 1 : 0,
    deliveryFailures: terminal && challenge.state === "delivery_failed" ? 1 : 0,
  });
}

function aggregateUpsert(
  db: D1DatabasePort,
  challengeId: string,
  aggregateDate: string,
  delta: AggregateDelta,
): D1PreparedStatementPort {
  return db
    .prepare(
      `INSERT INTO email_gate_daily_aggregates (
         aggregate_date, aggregate_schema_version,
         reconciliation_algorithm_version, challenges_issued,
         verification_successes, verification_invalid_attempts,
         verification_locked, verification_expired, delivery_failures
       )
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM email_gate_challenges
         WHERE challenge_id = ? AND reconciled_at IS NULL
       )
       ON CONFLICT (
         aggregate_date, aggregate_schema_version,
         reconciliation_algorithm_version
       ) DO UPDATE SET
         challenges_issued = challenges_issued + excluded.challenges_issued,
         verification_successes = verification_successes + excluded.verification_successes,
         verification_invalid_attempts = verification_invalid_attempts + excluded.verification_invalid_attempts,
         verification_locked = verification_locked + excluded.verification_locked,
         verification_expired = verification_expired + excluded.verification_expired,
         delivery_failures = delivery_failures + excluded.delivery_failures`,
    )
    .bind(
      aggregateDate,
      EMAIL_GATE_AGGREGATE_SCHEMA_VERSION,
      EMAIL_GATE_RECONCILIATION_VERSION,
      delta.challengesIssued,
      delta.verificationSuccesses,
      delta.verificationInvalidAttempts,
      delta.verificationLocked,
      delta.verificationExpired,
      delta.deliveryFailures,
      challengeId,
    );
}
