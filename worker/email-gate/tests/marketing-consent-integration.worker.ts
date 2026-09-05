import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

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

  it("routes C03 withdrawal paths to a non-mutating Marketing rejection", async () => {
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
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
  });
});

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
