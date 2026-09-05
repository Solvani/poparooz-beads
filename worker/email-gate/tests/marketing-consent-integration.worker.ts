import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MARKETING_CONSENT_VERSION } from "../../../src/contracts/marketing-consent/marketing-consent-contract";
import worker from "../index";

describe("Marketing Consent Worker integration", () => {
  it("routes an authorized grant and persists the Email Gate canonical email", async () => {
    const now = Date.now();
    const challengeId = "30000000-0000-4000-8000-000000000003";
    const canonicalEmail = "Canonical.Server@example.invalid";
    await insertChallenge({
      challengeId,
      canonicalEmail,
      state: "verified",
      createdAt: now - 1_000,
      verifiedAt: now - 500,
    });
    const before = await readChallenge(challengeId);

    const response = await worker.fetch(grantRequest(challengeId), env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "grant_persisted",
    });
    const subscription = await env.EMAIL_GATE_DB.prepare(
      `SELECT canonical_email AS canonicalEmail, status, state_version AS stateVersion
       FROM marketing_subscriptions`,
    ).first<
      Readonly<{
        canonicalEmail: string;
        status: string;
        stateVersion: number;
      }>
    >();
    expect(subscription).toEqual({
      canonicalEmail,
      status: "active",
      stateVersion: 1,
    });
    expect(await readChallenge(challengeId)).toEqual(before);
  });

  it("returns already_active without rewriting subscription or events", async () => {
    const now = Date.now();
    const canonicalEmail = "already-active@example.invalid";
    const firstChallengeId = "40000000-0000-4000-8000-000000000004";
    const secondChallengeId = "50000000-0000-4000-8000-000000000005";
    await insertChallenge({
      challengeId: firstChallengeId,
      canonicalEmail,
      state: "verified",
      createdAt: now - 2_000,
      verifiedAt: now - 1_500,
    });
    expect(
      (await worker.fetch(grantRequest(firstChallengeId), env)).status,
    ).toBe(200);
    const subscriptionBefore = await readSubscription(canonicalEmail);
    const eventsBefore = await readEvents();

    await insertChallenge({
      challengeId: secondChallengeId,
      canonicalEmail,
      state: "verified",
      createdAt: now - 1_000,
      verifiedAt: now - 500,
    });
    const response = await worker.fetch(grantRequest(secondChallengeId), env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "already_active",
    });
    expect(await readSubscription(canonicalEmail)).toEqual(subscriptionBefore);
    expect(await readEvents()).toEqual(eventsBefore);
  });

  it("creates no Marketing rows for missing authority", async () => {
    const response = await worker.fetch(
      grantRequest("60000000-0000-4000-8000-000000000006"),
      env,
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "verification_authority_invalid",
    });
    const count = await env.EMAIL_GATE_DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM marketing_subscriptions) +
         (SELECT COUNT(*) FROM marketing_consent_events) AS count`,
    ).first<Readonly<{ count: number }>>();
    expect(count?.count).toBe(0);
  });

  it("routes withdrawal with missing authority to a non-mutating authority rejection", async () => {
    const response = await worker.fetch(
      new Request(
        "https://generator.poparooz.com/api/marketing-consent/v1/withdrawals",
        {
          method: "POST",
          headers: {
            Origin: "https://generator.poparooz.com",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schemaVersion: 1,
            challengeId: "70000000-0000-4000-8000-000000000007",
          }),
        },
      ),
      env,
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "verification_authority_invalid",
    });
    expect(await readEvents()).toEqual([]);
  });
});

describe("Marketing Consent withdrawal Worker integration", () => {
  afterEach(() => vi.restoreAllMocks());

  async function activeFixture() {
    const clock = vi.spyOn(Date, "now").mockReturnValue(10_000);
    const canonicalEmail = "Withdrawal.Server@example.invalid";
    const challengeId = crypto.randomUUID();
    await insertChallenge({
      challengeId,
      canonicalEmail,
      state: "verified",
      createdAt: 8_000,
      verifiedAt: 9_000,
    });
    await expectResult(grantRequest(challengeId), 200, "grant_persisted");
    return { clock, canonicalEmail, grantChallengeId: challengeId };
  }

  async function verifiedChallenge(
    canonicalEmail: string,
    createdAt: number,
    verifiedAt: number,
  ) {
    const challengeId = crypto.randomUUID();
    await insertChallenge({
      challengeId,
      canonicalEmail,
      state: "verified",
      createdAt,
      verifiedAt,
    });
    return challengeId;
  }

  it("withdraws once, replays without mutation, and returns already_withdrawn for another challenge", async () => {
    const test = await activeFixture();
    test.clock.mockReturnValue(20_000);
    const w1 = await verifiedChallenge(test.canonicalEmail, 11_000, 12_000);
    const authorityBefore = await readChallenge(w1);
    const active = await readSubscription(test.canonicalEmail);
    await expectResult(withdrawalRequest(w1), 200, "withdrawn");
    const withdrawn = await readSubscription(test.canonicalEmail);
    expect(withdrawn).toMatchObject({
      subscription_id: active?.subscription_id,
      canonical_email: test.canonicalEmail,
      status: "withdrawn",
      state_version: 2,
      consent_timestamp: 10_000,
      withdrawn_timestamp: 20_000,
      retention_delete_after: 20_000 + 63_072_000_000,
    });
    const events = await readEvents();
    expect(events).toHaveLength(2);
    expect(events.filter((event) => event.event_type === "withdrawn")).toEqual([
      expect.objectContaining({
        subscription_state_version: 2,
        event_timestamp: 20_000,
        source_context: "generator_email_download_gate",
      }),
    ]);
    test.clock.mockReturnValue(21_000);
    await expectResult(withdrawalRequest(w1), 200, "withdrawn");
    expect(await readSubscription(test.canonicalEmail)).toEqual(withdrawn);
    expect(await readEvents()).toEqual(events);
    const w2 = await verifiedChallenge(test.canonicalEmail, 20_100, 20_200);
    await expectResult(withdrawalRequest(w2), 200, "already_withdrawn");
    expect(await readSubscription(test.canonicalEmail)).toEqual(withdrawn);
    expect(await readEvents()).toEqual(events);
    expect(await readChallenge(w1)).toEqual(authorityBefore);
  });

  it("rejects old W1 after fresh regrant G2, then accepts fresh W2 exactly once", async () => {
    const test = await activeFixture();
    test.clock.mockReturnValue(20_000);
    const w1 = await verifiedChallenge(test.canonicalEmail, 11_000, 12_000);
    await expectResult(withdrawalRequest(w1), 200, "withdrawn");
    const g2 = await verifiedChallenge(test.canonicalEmail, 21_000, 22_000);
    test.clock.mockReturnValue(30_000);
    await expectResult(grantRequest(g2), 200, "grant_persisted");
    const regranted = await readSubscription(test.canonicalEmail);
    const events = await readEvents();
    expect(regranted).toMatchObject({
      status: "active",
      state_version: 3,
      consent_timestamp: 30_000,
      withdrawn_timestamp: null,
      retention_delete_after: null,
    });
    expect(events).toHaveLength(3);
    const w1Before = await readChallenge(w1);
    test.clock.mockReturnValue(40_000);
    await expectResult(
      withdrawalRequest(w1),
      409,
      "verification_authority_invalid",
    );
    expect(await readSubscription(test.canonicalEmail)).toEqual(regranted);
    expect(await readEvents()).toEqual(events);
    expect(await readChallenge(w1)).toEqual(w1Before);
    const w2 = await verifiedChallenge(test.canonicalEmail, 31_000, 32_000);
    await expectResult(withdrawalRequest(w2), 200, "withdrawn");
    const final = await readSubscription(test.canonicalEmail);
    expect(final).toMatchObject({
      subscription_id: regranted?.subscription_id,
      status: "withdrawn",
      state_version: 4,
      consent_timestamp: 30_000,
      withdrawn_timestamp: 40_000,
      retention_delete_after: 40_000 + 63_072_000_000,
    });
    const finalEvents = await readEvents();
    expect(finalEvents).toHaveLength(4);
    expect(
      finalEvents.filter((event) => event.event_type === "withdrawn"),
    ).toHaveLength(2);
  });

  it.each([
    [9_000, 11_000],
    [10_000, 11_000],
    [9_000, 10_000],
  ])(
    "rejects stale active authority created %i verified %i",
    async (createdAt, verifiedAt) => {
      const test = await activeFixture();
      test.clock.mockReturnValue(20_000);
      const challengeId = await verifiedChallenge(
        test.canonicalEmail,
        createdAt,
        verifiedAt,
      );
      const subscription = await readSubscription(test.canonicalEmail);
      const events = await readEvents();
      const challenge = await readChallenge(challengeId);
      await expectResult(
        withdrawalRequest(challengeId),
        409,
        "verification_authority_invalid",
      );
      expect(await readSubscription(test.canonicalEmail)).toEqual(subscription);
      expect(await readEvents()).toEqual(events);
      expect(await readChallenge(challengeId)).toEqual(challenge);
    },
  );

  it.each([600_000, 600_001])(
    "enforces the real withdrawal authority boundary at %i ms",
    async (age) => {
      const test = await activeFixture();
      const challengeId = await verifiedChallenge(
        test.canonicalEmail,
        11_000,
        12_000,
      );
      test.clock.mockReturnValue(12_000 + age);
      const subscription = await readSubscription(test.canonicalEmail);
      const events = await readEvents();
      const challenge = await readChallenge(challengeId);
      await expectResult(
        withdrawalRequest(challengeId),
        age === 600_000 ? 200 : 409,
        age === 600_000 ? "withdrawn" : "verification_authority_invalid",
      );
      if (age === 600_001) {
        expect(await readSubscription(test.canonicalEmail)).toEqual(
          subscription,
        );
        expect(await readEvents()).toEqual(events);
      } else {
        expect(await readSubscription(test.canonicalEmail)).toMatchObject({
          status: "withdrawn",
          state_version: 2,
        });
        expect(await readEvents()).toHaveLength(2);
      }
      expect(await readChallenge(challengeId)).toEqual(challenge);
    },
  );

  it("returns not_active without creating a subscription or event", async () => {
    vi.spyOn(Date, "now").mockReturnValue(20_000);
    const canonicalEmail = "no-subscription@example.invalid";
    const challengeId = await verifiedChallenge(canonicalEmail, 11_000, 12_000);
    const before = await readChallenge(challengeId);
    await expectResult(withdrawalRequest(challengeId), 200, "not_active");
    expect(await readSubscription(canonicalEmail)).toBeNull();
    expect(await readEvents()).toEqual([]);
    expect(await readChallenge(challengeId)).toEqual(before);
  });

  it.each(["missing", "deleted", "nonverified", "future"] as const)(
    "fails closed for %s authority without Marketing or Email Gate mutation",
    async (kind) => {
      const test = await activeFixture();
      test.clock.mockReturnValue(20_000);
      const challengeId = crypto.randomUUID();
      if (kind !== "missing") {
        await insertChallenge({
          challengeId,
          canonicalEmail: test.canonicalEmail,
          state: kind === "nonverified" ? "active" : "verified",
          createdAt: 11_000,
          verifiedAt:
            kind === "nonverified" ? null : kind === "future" ? 20_001 : 12_000,
        });
      }
      if (kind === "deleted") {
        await env.EMAIL_GATE_DB.prepare(
          "DELETE FROM email_gate_challenges WHERE challenge_id = ?",
        )
          .bind(challengeId)
          .run();
      }
      const challenge = await readChallenge(challengeId);
      const subscription = await readSubscription(test.canonicalEmail);
      const events = await readEvents();
      await expectResult(
        withdrawalRequest(challengeId),
        409,
        "verification_authority_invalid",
      );
      expect(await readSubscription(test.canonicalEmail)).toEqual(subscription);
      expect(await readEvents()).toEqual(events);
      expect(await readChallenge(challengeId)).toEqual(challenge);
    },
  );
});

async function expectResult(
  request: Request,
  status: number,
  result: string,
): Promise<void> {
  const response = await worker.fetch(request, env);
  expect(response.status).toBe(status);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.redirected).toBe(false);
  await expect(response.json()).resolves.toEqual({ schemaVersion: 1, result });
}

function withdrawalRequest(challengeId: string): Request {
  return new Request(
    "https://generator.poparooz.com/api/marketing-consent/v1/withdrawals",
    {
      method: "POST",
      headers: {
        Origin: "https://generator.poparooz.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ schemaVersion: 1, challengeId }),
    },
  );
}

function grantRequest(challengeId: string): Request {
  return new Request(
    "https://generator.poparooz.com/api/marketing-consent/v1/grants",
    {
      method: "POST",
      headers: {
        Origin: "https://generator.poparooz.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schemaVersion: 1,
        challengeId,
        consentVersion: MARKETING_CONSENT_VERSION,
        affirmativeIntent: true,
      }),
    },
  );
}

interface ChallengeFixture {
  readonly challengeId: string;
  readonly canonicalEmail: string;
  readonly state: "verified" | "active";
  readonly createdAt: number;
  readonly verifiedAt: number | null;
}

async function insertChallenge(input: ChallengeFixture): Promise<void> {
  const activatedAt = input.createdAt + 1;
  const terminalAt = input.state === "verified" ? input.verifiedAt : null;
  await env.EMAIL_GATE_DB.prepare(
    `INSERT INTO email_gate_challenges (
       challenge_id, normalized_email, state, otp_key_version,
       provider_send_event_id, delivery_payload_version,
       provider_attempt_count, attempt_count, created_at, expires_at,
       activated_at, verified_at, terminal_at, last_provider_attempt_at,
       deletion_eligible_at
     ) VALUES (?, ?, ?, 1, ?, 1, 1, 0, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.challengeId,
      input.canonicalEmail,
      input.state,
      `provider-${input.challengeId}`,
      input.createdAt,
      input.createdAt + 600_000,
      activatedAt,
      input.verifiedAt,
      terminalAt,
      input.createdAt,
      terminalAt,
    )
    .run();
}

async function readChallenge(
  challengeId: string,
): Promise<Record<string, unknown> | null> {
  return env.EMAIL_GATE_DB.prepare(
    "SELECT * FROM email_gate_challenges WHERE challenge_id = ?",
  )
    .bind(challengeId)
    .first<Record<string, unknown>>();
}

async function readSubscription(
  canonicalEmail: string,
): Promise<Record<string, unknown> | null> {
  return env.EMAIL_GATE_DB.prepare(
    "SELECT * FROM marketing_subscriptions WHERE canonical_email = ?",
  )
    .bind(canonicalEmail)
    .first<Record<string, unknown>>();
}

async function readEvents(): Promise<readonly Record<string, unknown>[]> {
  const result = await env.EMAIL_GATE_DB.prepare(
    "SELECT * FROM marketing_consent_events ORDER BY event_id",
  ).all<Record<string, unknown>>();
  return result.results;
}
