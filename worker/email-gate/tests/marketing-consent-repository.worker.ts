import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  createGrantOperationKey,
  createWithdrawalOperationKey,
} from "../crypto/marketing-consent-operation-key";
import {
  MARKETING_CONSENT_RETENTION_MS,
  MARKETING_CONSENT_SOURCE_CONTEXT,
  MARKETING_CONSENT_VERSION,
  MARKETING_CONSENT_VERSION_SEQUENCE,
  createMarketingConsentRepository,
  type MarketingConsentGrantInput,
  type MarketingConsentWithdrawalInput,
} from "../repository/marketing-consent-repository";

describe("Marketing Consent operation keys", () => {
  it("derives the frozen lowercase SHA-256 grant and withdrawal vectors", async () => {
    await expect(
      createGrantOperationKey(
        "00000000-0000-4000-8000-000000000001",
        MARKETING_CONSENT_VERSION,
      ),
    ).resolves.toBe(
      "0d1c226cc29bf0c61e04d1e4c79dd266e0636b5814a60f4702224bae8200645b",
    );
    await expect(
      createWithdrawalOperationKey("00000000-0000-4000-8000-000000000002"),
    ).resolves.toBe(
      "94181f4ef9f471bbacb777e1f69ba9e40ce2e312262c0677d7e83777275a57f8",
    );
  });
});

describe("Marketing Consent repository", () => {
  it("persists a first grant and makes same-operation replay idempotent", async () => {
    const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
    const input = grantInput({ canonicalEmail: "first@example.com" });

    await expect(repository.grant(input)).resolves.toBe("grant_persisted");
    const initial = await readSubscription(input.canonicalEmail);
    expect(initial).toEqual({
      subscriptionId: input.subscriptionId,
      canonicalEmail: input.canonicalEmail,
      status: "active",
      consentVersion: MARKETING_CONSENT_VERSION,
      consentVersionSequence: MARKETING_CONSENT_VERSION_SEQUENCE,
      consentSourceContext: MARKETING_CONSENT_SOURCE_CONTEXT,
      consentTimestamp: input.timestamp,
      withdrawnTimestamp: null,
      retentionDeleteAfter: null,
      stateVersion: 1,
      lastTransitionOperationKey: await createGrantOperationKey(
        input.challengeId,
        MARKETING_CONSENT_VERSION,
      ),
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
    });
    expect(await readEvents(input.subscriptionId)).toEqual([
      expect.objectContaining({
        subscriptionStateVersion: 1,
        eventType: "granted",
        consentVersion: MARKETING_CONSENT_VERSION,
        consentVersionSequence: MARKETING_CONSENT_VERSION_SEQUENCE,
        sourceContext: MARKETING_CONSENT_SOURCE_CONTEXT,
        eventTimestamp: input.timestamp,
      }),
    ]);

    await expect(
      repository.grant({
        ...input,
        subscriptionId: "discarded-replay-subscription",
        eventId: "discarded-replay-event",
        timestamp: input.timestamp + 50,
      }),
    ).resolves.toBe("grant_persisted");
    expect(await readSubscription(input.canonicalEmail)).toEqual(initial);
    expect(await eventCount(input.subscriptionId)).toBe(1);
  });

  it("returns already_active for a different challenge without rewriting state", async () => {
    const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
    const first = grantInput({ canonicalEmail: "active@example.com" });
    await repository.grant(first);
    const initial = await readSubscription(first.canonicalEmail);

    await expect(
      repository.grant(
        grantInput({
          canonicalEmail: first.canonicalEmail,
          subscriptionId: "discarded-active-subscription",
          eventId: "discarded-active-event",
          challengeId: "00000000-0000-4000-8000-000000000011",
          challengeCreatedAt: 20,
          challengeVerifiedAt: 21,
          timestamp: 22,
        }),
      ),
    ).resolves.toBe("already_active");
    expect(await readSubscription(first.canonicalEmail)).toEqual(initial);
    expect(await eventCount(first.subscriptionId)).toBe(1);
  });

  it("converges concurrent first grants to one canonical subscription and event", async () => {
    const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
    const canonicalEmail = "concurrent@example.com";
    const results = await Promise.all([
      repository.grant(
        grantInput({
          canonicalEmail,
          subscriptionId: "subscription-concurrent-a",
          eventId: "event-concurrent-a",
          challengeId: "00000000-0000-4000-8000-000000000021",
          challengeCreatedAt: 10,
          challengeVerifiedAt: 11,
          timestamp: 12,
        }),
      ),
      repository.grant(
        grantInput({
          canonicalEmail,
          subscriptionId: "subscription-concurrent-b",
          eventId: "event-concurrent-b",
          challengeId: "00000000-0000-4000-8000-000000000022",
          challengeCreatedAt: 20,
          challengeVerifiedAt: 21,
          timestamp: 22,
        }),
      ),
    ]);

    expect(results).toContain("grant_persisted");
    expect(results).toContain("already_active");
    expect(await subscriptionCount(canonicalEmail)).toBe(1);
    const subscription = await readSubscription(canonicalEmail);
    expect(subscription?.stateVersion).toBe(1);
    expect(await eventCount(subscription!.subscriptionId)).toBe(1);
    expect(await orphanEventCount()).toBe(0);
  });

  it("rolls back the subscription when the event identifier conflicts", async () => {
    const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
    await repository.grant(
      grantInput({
        canonicalEmail: "atomic-a@example.com",
        eventId: "shared-event-id",
      }),
    );

    await expect(
      repository.grant(
        grantInput({
          canonicalEmail: "atomic-b@example.com",
          subscriptionId: "subscription-atomic-b",
          eventId: "shared-event-id",
          challengeId: "00000000-0000-4000-8000-000000000031",
        }),
      ),
    ).rejects.toThrow();
    expect(await readSubscription("atomic-b@example.com")).toBeNull();
    expect(await orphanEventCount()).toBe(0);
  });

  it("withdraws once, retains for 730 days, and classifies later replays", async () => {
    const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
    const grant = grantInput({ canonicalEmail: "withdraw@example.com" });
    await repository.grant(grant);
    const withdrawal = withdrawalInput({
      canonicalEmail: grant.canonicalEmail,
      challengeCreatedAt: 20,
      challengeVerifiedAt: 21,
      timestamp: 22,
    });

    await expect(repository.withdraw(withdrawal)).resolves.toBe("withdrawn");
    const withdrawn = await readSubscription(grant.canonicalEmail);
    expect(withdrawn).toMatchObject({
      subscriptionId: grant.subscriptionId,
      status: "withdrawn",
      consentTimestamp: grant.timestamp,
      withdrawnTimestamp: withdrawal.timestamp,
      retentionDeleteAfter:
        withdrawal.timestamp + MARKETING_CONSENT_RETENTION_MS,
      stateVersion: 2,
      updatedAt: withdrawal.timestamp,
    });
    expect(await eventCount(grant.subscriptionId)).toBe(2);

    await expect(
      repository.withdraw({
        ...withdrawal,
        eventId: "discarded-withdrawal-replay-event",
        timestamp: 30,
      }),
    ).resolves.toBe("withdrawn");
    expect(await readSubscription(grant.canonicalEmail)).toEqual(withdrawn);
    expect(await eventCount(grant.subscriptionId)).toBe(2);

    await expect(
      repository.withdraw(
        withdrawalInput({
          canonicalEmail: grant.canonicalEmail,
          challengeId: "00000000-0000-4000-8000-000000000041",
          eventId: "event-withdrawal-different",
          challengeCreatedAt: 31,
          challengeVerifiedAt: 32,
          timestamp: 33,
        }),
      ),
    ).resolves.toBe("already_withdrawn");
    expect(await readSubscription(grant.canonicalEmail)).toEqual(withdrawn);
    expect(await eventCount(grant.subscriptionId)).toBe(2);
  });

  it("returns not_active when no subscription exists", async () => {
    const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
    await expect(
      repository.withdraw(
        withdrawalInput({ canonicalEmail: "none@example.com" }),
      ),
    ).resolves.toBe("not_active");
    expect(await totalEventCount()).toBe(0);
  });

  it.each([
    ["created before withdrawal", 21, 31],
    ["created equal to withdrawal", 22, 31],
    ["verified equal to withdrawal", 21, 22],
  ] as const)(
    "rejects stale post-withdrawal regrant authority: %s",
    async (_label, challengeCreatedAt, challengeVerifiedAt) => {
      const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
      const grant = grantInput({ canonicalEmail: "stale-regrant@example.com" });
      await repository.grant(grant);
      await repository.withdraw(
        withdrawalInput({
          canonicalEmail: grant.canonicalEmail,
          challengeCreatedAt: 20,
          challengeVerifiedAt: 21,
          timestamp: 22,
        }),
      );
      const before = await readSubscription(grant.canonicalEmail);

      await expect(
        repository.grant(
          grantInput({
            canonicalEmail: grant.canonicalEmail,
            subscriptionId: "discarded-stale-regrant-subscription",
            eventId: "discarded-stale-regrant-event",
            challengeId: "00000000-0000-4000-8000-000000000051",
            challengeCreatedAt,
            challengeVerifiedAt,
            timestamp: 32,
          }),
        ),
      ).resolves.toBe("verification_authority_invalid");
      expect(await readSubscription(grant.canonicalEmail)).toEqual(before);
      expect(await eventCount(grant.subscriptionId)).toBe(2);
    },
  );

  it.each([
    ["created before consent", 11, 20],
    ["created equal to consent", 12, 20],
    ["verified equal to consent", 11, 12],
  ] as const)(
    "rejects stale active-withdrawal authority: %s",
    async (_label, challengeCreatedAt, challengeVerifiedAt) => {
      const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
      const grant = grantInput({
        canonicalEmail: "stale-withdraw@example.com",
      });
      await repository.grant(grant);
      const before = await readSubscription(grant.canonicalEmail);

      await expect(
        repository.withdraw(
          withdrawalInput({
            canonicalEmail: grant.canonicalEmail,
            challengeId: "00000000-0000-4000-8000-000000000061",
            eventId: "discarded-stale-withdraw-event",
            challengeCreatedAt,
            challengeVerifiedAt,
            timestamp: 21,
          }),
        ),
      ).resolves.toBe("verification_authority_invalid");
      expect(await readSubscription(grant.canonicalEmail)).toEqual(before);
      expect(await eventCount(grant.subscriptionId)).toBe(1);
    },
  );

  it("regrants only with fresh authority and rejects an old withdrawal replay", async () => {
    const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
    const firstGrant = grantInput({ canonicalEmail: "regrant@example.com" });
    await repository.grant(firstGrant);
    const firstWithdrawal = withdrawalInput({
      canonicalEmail: firstGrant.canonicalEmail,
      challengeId: "00000000-0000-4000-8000-000000000071",
      eventId: "event-withdraw-first",
      challengeCreatedAt: 20,
      challengeVerifiedAt: 21,
      timestamp: 22,
    });
    await repository.withdraw(firstWithdrawal);

    const regrant = grantInput({
      canonicalEmail: firstGrant.canonicalEmail,
      subscriptionId: "discarded-regrant-subscription",
      eventId: "event-regrant",
      challengeId: "00000000-0000-4000-8000-000000000072",
      challengeCreatedAt: 23,
      challengeVerifiedAt: 24,
      timestamp: 25,
    });
    await expect(repository.grant(regrant)).resolves.toBe("grant_persisted");
    const active = await readSubscription(firstGrant.canonicalEmail);
    expect(active).toMatchObject({
      subscriptionId: firstGrant.subscriptionId,
      status: "active",
      consentTimestamp: regrant.timestamp,
      withdrawnTimestamp: null,
      retentionDeleteAfter: null,
      stateVersion: 3,
      updatedAt: regrant.timestamp,
    });
    expect(await eventCount(firstGrant.subscriptionId)).toBe(3);

    await expect(
      repository.withdraw({ ...firstWithdrawal, timestamp: 26 }),
    ).resolves.toBe("verification_authority_invalid");
    expect(await readSubscription(firstGrant.canonicalEmail)).toEqual(active);
    expect(await eventCount(firstGrant.subscriptionId)).toBe(3);

    await expect(
      repository.withdraw(
        withdrawalInput({
          canonicalEmail: firstGrant.canonicalEmail,
          challengeId: "00000000-0000-4000-8000-000000000073",
          eventId: "event-withdraw-fresh",
          challengeCreatedAt: 26,
          challengeVerifiedAt: 27,
          timestamp: 28,
        }),
      ),
    ).resolves.toBe("withdrawn");
    expect(await readSubscription(firstGrant.canonicalEmail)).toMatchObject({
      status: "withdrawn",
      withdrawnTimestamp: 28,
      retentionDeleteAfter: 28 + MARKETING_CONSENT_RETENTION_MS,
      stateVersion: 4,
      updatedAt: 28,
    });
    expect(await eventCount(firstGrant.subscriptionId)).toBe(4);
  });

  it("rejects invalid or non-monotonic authority timelines without mutation", async () => {
    const repository = createMarketingConsentRepository(env.EMAIL_GATE_DB);
    await expect(
      repository.grant(
        grantInput({
          canonicalEmail: "invalid-timeline@example.com",
          challengeCreatedAt: 20,
          challengeVerifiedAt: 19,
          timestamp: 21,
        }),
      ),
    ).resolves.toBe("verification_authority_invalid");
    await expect(
      repository.withdraw(
        withdrawalInput({
          canonicalEmail: "invalid-timeline@example.com",
          timestamp: Number.MAX_SAFE_INTEGER,
        }),
      ),
    ).resolves.toBe("verification_authority_invalid");
    expect(await readSubscription("invalid-timeline@example.com")).toBeNull();
    expect(await totalEventCount()).toBe(0);
  });
});

function grantInput(
  overrides: Partial<MarketingConsentGrantInput> = {},
): MarketingConsentGrantInput {
  return {
    canonicalEmail: "default@example.com",
    challengeId: "00000000-0000-4000-8000-000000000001",
    challengeCreatedAt: 10,
    challengeVerifiedAt: 11,
    subscriptionId: "subscription-default",
    eventId: "event-grant-default",
    timestamp: 12,
    ...overrides,
  };
}

function withdrawalInput(
  overrides: Partial<MarketingConsentWithdrawalInput> = {},
): MarketingConsentWithdrawalInput {
  return {
    canonicalEmail: "default@example.com",
    challengeId: "00000000-0000-4000-8000-000000000002",
    challengeCreatedAt: 13,
    challengeVerifiedAt: 14,
    eventId: "event-withdraw-default",
    timestamp: 15,
    ...overrides,
  };
}

interface SubscriptionRow {
  readonly subscriptionId: string;
  readonly canonicalEmail: string;
  readonly status: "active" | "withdrawn";
  readonly consentVersion: string;
  readonly consentVersionSequence: number;
  readonly consentSourceContext: string;
  readonly consentTimestamp: number;
  readonly withdrawnTimestamp: number | null;
  readonly retentionDeleteAfter: number | null;
  readonly stateVersion: number;
  readonly lastTransitionOperationKey: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

function readSubscription(
  canonicalEmail: string,
): Promise<SubscriptionRow | null> {
  return env.EMAIL_GATE_DB.prepare(
    `SELECT subscription_id AS subscriptionId,
            canonical_email AS canonicalEmail,
            status,
            consent_version AS consentVersion,
            consent_version_sequence AS consentVersionSequence,
            consent_source_context AS consentSourceContext,
            consent_timestamp AS consentTimestamp,
            withdrawn_timestamp AS withdrawnTimestamp,
            retention_delete_after AS retentionDeleteAfter,
            state_version AS stateVersion,
            last_transition_operation_key AS lastTransitionOperationKey,
            created_at AS createdAt,
            updated_at AS updatedAt
     FROM marketing_subscriptions WHERE canonical_email = ?`,
  )
    .bind(canonicalEmail)
    .first<SubscriptionRow>();
}

interface EventRow {
  readonly eventId: string;
  readonly subscriptionId: string;
  readonly subscriptionStateVersion: number;
  readonly operationKey: string;
  readonly eventType: "granted" | "withdrawn";
  readonly consentVersion: string;
  readonly consentVersionSequence: number;
  readonly sourceContext: string;
  readonly eventTimestamp: number;
}

async function readEvents(
  subscriptionId: string,
): Promise<readonly EventRow[]> {
  const result = await env.EMAIL_GATE_DB.prepare(
    `SELECT event_id AS eventId,
            subscription_id AS subscriptionId,
            subscription_state_version AS subscriptionStateVersion,
            operation_key AS operationKey,
            event_type AS eventType,
            consent_version AS consentVersion,
            consent_version_sequence AS consentVersionSequence,
            source_context AS sourceContext,
            event_timestamp AS eventTimestamp
     FROM marketing_consent_events
     WHERE subscription_id = ?
     ORDER BY subscription_state_version`,
  )
    .bind(subscriptionId)
    .all<EventRow>();
  return result.results;
}

async function subscriptionCount(canonicalEmail: string): Promise<number> {
  const row = await env.EMAIL_GATE_DB.prepare(
    `SELECT COUNT(*) AS count FROM marketing_subscriptions
     WHERE canonical_email = ?`,
  )
    .bind(canonicalEmail)
    .first<Readonly<{ count: number }>>();
  return row?.count ?? 0;
}

async function eventCount(subscriptionId: string): Promise<number> {
  const row = await env.EMAIL_GATE_DB.prepare(
    `SELECT COUNT(*) AS count FROM marketing_consent_events
     WHERE subscription_id = ?`,
  )
    .bind(subscriptionId)
    .first<Readonly<{ count: number }>>();
  return row?.count ?? 0;
}

async function totalEventCount(): Promise<number> {
  const row = await env.EMAIL_GATE_DB.prepare(
    "SELECT COUNT(*) AS count FROM marketing_consent_events",
  ).first<Readonly<{ count: number }>>();
  return row?.count ?? 0;
}

async function orphanEventCount(): Promise<number> {
  const row = await env.EMAIL_GATE_DB.prepare(
    `SELECT COUNT(*) AS count
     FROM marketing_consent_events AS events
     LEFT JOIN marketing_subscriptions AS subscriptions
       ON subscriptions.subscription_id = events.subscription_id
     WHERE subscriptions.subscription_id IS NULL`,
  ).first<Readonly<{ count: number }>>();
  return row?.count ?? 0;
}
