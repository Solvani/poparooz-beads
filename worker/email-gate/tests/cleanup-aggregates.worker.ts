import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { EMAIL_GATE_RESERVATION_MS } from "../model";
import { createEmailGateRepository } from "../repository/email-gate-repository";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 7, 26, 12);

describe("aggregate reconciliation and cleanup", () => {
  it("reconciles same-day issued and terminal units exactly once", async () => {
    await seedTerminal({
      suffix: "same",
      state: "verified",
      createdAt: NOW - 10_000,
      terminalAt: NOW - 1_000,
      attemptCount: 2,
      deletionEligibleAt: NOW + DAY,
    });
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await expect(repository.reconcileAndCleanup(NOW)).resolves.toBe(1);
    expect(await aggregates()).toEqual([
      expect.objectContaining({
        aggregateDate: "2026-08-26",
        challengesIssued: 1,
        verificationSuccesses: 1,
        verificationInvalidAttempts: 2,
        verificationLocked: 0,
        verificationExpired: 0,
        deliveryFailures: 0,
      }),
    ]);
    await repository.reconcileAndCleanup(NOW);
    expect((await aggregates())[0]?.challengesIssued).toBe(1);
  });

  it("separates issued-day and terminal-day aggregate snapshots", async () => {
    const issuedAt = Date.UTC(2026, 7, 25, 23, 58);
    await seedTerminal({
      suffix: "cross",
      state: "terminal_failed",
      createdAt: issuedAt,
      terminalAt: issuedAt + 5 * 60_000,
      attemptCount: 5,
      deletionEligibleAt: NOW + DAY,
    });
    await createEmailGateRepository(env.EMAIL_GATE_DB).reconcileAndCleanup(NOW);
    expect(await aggregates()).toEqual([
      expect.objectContaining({
        aggregateDate: "2026-08-25",
        challengesIssued: 1,
        verificationLocked: 0,
      }),
      expect.objectContaining({
        aggregateDate: "2026-08-26",
        challengesIssued: 0,
        verificationInvalidAttempts: 5,
        verificationLocked: 1,
      }),
    ]);
  });

  it.each([
    ["expired", "verificationExpired"],
    ["delivery_failed", "deliveryFailures"],
  ] as const)("counts terminal state %s once", async (state, field) => {
    await seedTerminal({
      suffix: state,
      state,
      createdAt: NOW - 10,
      terminalAt: NOW,
      attemptCount: 0,
      deletionEligibleAt: NOW + DAY,
    });
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await repository.reconcileAndCleanup(NOW);
    await repository.reconcileAndCleanup(NOW);
    expect((await aggregates())[0]?.[field]).toBe(1);
  });

  it("rolls aggregate writes back and never deletes identity when reconciliation fails", async () => {
    await seedTerminal({
      suffix: "fail",
      state: "verified",
      createdAt: NOW - 10,
      terminalAt: NOW - 1,
      attemptCount: 0,
      deletionEligibleAt: NOW - 1,
    });
    await env.EMAIL_GATE_DB.prepare(
      `CREATE TRIGGER fail_aggregate
       BEFORE INSERT ON email_gate_daily_aggregates
       BEGIN SELECT RAISE(FAIL, 'test aggregate failure'); END;`,
    ).run();
    await expect(
      createEmailGateRepository(env.EMAIL_GATE_DB).reconcileAndCleanup(NOW),
    ).rejects.toThrow();
    const challenge = await env.EMAIL_GATE_DB.prepare(
      "SELECT reconciled_at AS reconciledAt FROM email_gate_challenges WHERE challenge_id = ?",
    )
      .bind(id("fail"))
      .first<Readonly<{ reconciledAt: number | null }>>();
    expect(challenge).toEqual({ reconciledAt: null });
    expect(await aggregates()).toEqual([]);
    expect(
      await createEmailGateRepository(env.EMAIL_GATE_DB).findChallenge(
        id("fail"),
      ),
    ).not.toBeNull();

    await env.EMAIL_GATE_DB.prepare("DROP TRIGGER fail_aggregate").run();
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await repository.reconcileAndCleanup(NOW);
    await repository.reconcileAndCleanup(NOW);
    expect((await aggregates())[0]?.verificationSuccesses).toBe(1);
  });

  it("rolls aggregate writes back when the reconciliation marker fails", async () => {
    await seedTerminal({
      suffix: "marker-fail",
      state: "verified",
      createdAt: NOW - 10,
      terminalAt: NOW - 1,
      attemptCount: 0,
      deletionEligibleAt: NOW + DAY,
    });
    await env.EMAIL_GATE_DB.prepare(
      `CREATE TRIGGER fail_reconciliation_marker
       BEFORE UPDATE OF reconciled_at ON email_gate_challenges
       WHEN OLD.reconciled_at IS NULL AND NEW.reconciled_at IS NOT NULL
       BEGIN SELECT RAISE(FAIL, 'test marker failure'); END;`,
    ).run();

    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await expect(repository.reconcileAndCleanup(NOW)).rejects.toThrow();
    const challenge = await repository.findChallenge(id("marker-fail"));
    expect(challenge?.reconciledAt).toBeNull();
    expect(await aggregates()).toEqual([]);

    await env.EMAIL_GATE_DB.prepare(
      "DROP TRIGGER fail_reconciliation_marker",
    ).run();
    await repository.reconcileAndCleanup(NOW);
    await repository.reconcileAndCleanup(NOW);
    expect((await aggregates())[0]?.verificationSuccesses).toBe(1);
  });

  it("deletes only reconciled identity after its eligibility time", async () => {
    const createdAt = NOW - DAY;
    await seedTerminal({
      suffix: "delete",
      state: "verified",
      createdAt,
      terminalAt: createdAt + 2,
      attemptCount: 0,
      deletionEligibleAt: NOW - 1,
    });
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await repository.reconcileAndCleanup(NOW);
    const deleted = await repository.findChallenge(id("delete"));
    expect(deleted).toBeNull();
    expect((await aggregates())[0]?.verificationSuccesses).toBe(1);
  });

  it("processes at most 25 challenge rows per invocation", async () => {
    for (let index = 0; index < 30; index += 1) {
      await seedTerminal({
        suffix: `bounded-${index}`,
        state: "expired",
        createdAt: NOW - 100,
        terminalAt: NOW - 10,
        attemptCount: 0,
        deletionEligibleAt: NOW + DAY,
        email: `bounded-${index}@example.com`,
      });
    }
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await expect(repository.reconcileAndCleanup(NOW)).resolves.toBe(25);
    const unreconciled = await env.EMAIL_GATE_DB.prepare(
      `SELECT COUNT(*) AS count FROM email_gate_challenges
       WHERE reconciled_at IS NULL`,
    ).first<Readonly<{ count: number }>>();
    expect(unreconciled?.count).toBe(5);
  });

  it("stops counting expired reservations and deletes them retry-safely", async () => {
    const expiredStatements = Array.from({ length: 90 }, (_, index) =>
      env.EMAIL_GATE_DB.prepare(
        `INSERT INTO email_gate_send_reservations
         (provider_send_event_id, reserved_at, expires_at)
         VALUES (?, ?, ?)`,
      ).bind(`expired-${index}`, NOW - EMAIL_GATE_RESERVATION_MS, NOW),
    );
    await env.EMAIL_GATE_DB.batch(expiredStatements);
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    const created = await repository.createNewPending({
      challengeId: id("new"),
      normalizedEmail: "new@example.com",
      otpKeyVersion: 1,
      providerSendEventId: "new-event",
      deliveryPayloadVersion: 1,
      createdAt: NOW,
      expiresAt: NOW + 600_000,
    });
    expect(created).not.toBeNull();
    await repository.reconcileAndCleanup(NOW);
    const expiredCount = await env.EMAIL_GATE_DB.prepare(
      `SELECT COUNT(*) AS count FROM email_gate_send_reservations
       WHERE expires_at <= ?`,
    )
      .bind(NOW)
      .first<Readonly<{ count: number }>>();
    expect(expiredCount?.count).toBe(65);
  });

  it("supports restore-style snapshot reconstruction without identity fields", async () => {
    await seedTerminal({
      suffix: "restore",
      state: "verified",
      createdAt: NOW - 10,
      terminalAt: NOW,
      attemptCount: 1,
      deletionEligibleAt: NOW + DAY,
    });
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await repository.reconcileAndCleanup(NOW);
    const firstSnapshot = await aggregates();
    await env.EMAIL_GATE_DB.batch([
      env.EMAIL_GATE_DB.prepare("DELETE FROM email_gate_daily_aggregates"),
      env.EMAIL_GATE_DB.prepare(
        `UPDATE email_gate_challenges
         SET reconciled_at = NULL, reconciliation_version = NULL
         WHERE challenge_id = ?`,
      ).bind(id("restore")),
    ]);
    await repository.reconcileAndCleanup(NOW + 1);
    expect(await aggregates()).toEqual(firstSnapshot);

    const columns = await env.EMAIL_GATE_DB.prepare(
      "PRAGMA table_info(email_gate_daily_aggregates)",
    ).all<Readonly<{ name: string }>>();
    expect(columns.results.map((row) => row.name)).not.toEqual(
      expect.arrayContaining([
        "email",
        "challenge_id",
        "provider_send_event_id",
        "ip",
        "deletion_count",
      ]),
    );
  });
});

interface AggregateRow {
  readonly aggregateDate: string;
  readonly challengesIssued: number;
  readonly verificationSuccesses: number;
  readonly verificationInvalidAttempts: number;
  readonly verificationLocked: number;
  readonly verificationExpired: number;
  readonly deliveryFailures: number;
}

async function aggregates(): Promise<readonly AggregateRow[]> {
  const result = await env.EMAIL_GATE_DB.prepare(
    `SELECT
       aggregate_date AS aggregateDate,
       challenges_issued AS challengesIssued,
       verification_successes AS verificationSuccesses,
       verification_invalid_attempts AS verificationInvalidAttempts,
       verification_locked AS verificationLocked,
       verification_expired AS verificationExpired,
       delivery_failures AS deliveryFailures
     FROM email_gate_daily_aggregates
     ORDER BY aggregate_date`,
  ).all<AggregateRow>();
  return result.results;
}

interface TerminalSeed {
  readonly suffix: string;
  readonly state:
    "verified" | "terminal_failed" | "expired" | "delivery_failed";
  readonly createdAt: number;
  readonly terminalAt: number;
  readonly attemptCount: number;
  readonly deletionEligibleAt: number;
  readonly email?: string;
}

async function seedTerminal(seed: TerminalSeed): Promise<void> {
  const challengeId = id(seed.suffix);
  const eventId = `event-${seed.suffix}`;
  const createdAt =
    seed.state === "expired" ? seed.terminalAt - 600_000 : seed.createdAt;
  await env.EMAIL_GATE_DB.batch([
    env.EMAIL_GATE_DB.prepare(
      `INSERT INTO email_gate_send_reservations
       (provider_send_event_id, reserved_at, expires_at)
       VALUES (?, ?, ?)`,
    ).bind(eventId, createdAt, createdAt + EMAIL_GATE_RESERVATION_MS),
    env.EMAIL_GATE_DB.prepare(
      `INSERT INTO email_gate_challenges (
         challenge_id, normalized_email, state, otp_key_version,
         provider_send_event_id, delivery_payload_version,
         provider_attempt_count, attempt_count, created_at, expires_at,
         activated_at, verified_at, terminal_at, last_provider_attempt_at,
         deletion_eligible_at
       ) VALUES (?, ?, ?, 1, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      challengeId,
      seed.email ?? `${seed.suffix}@example.com`,
      seed.state,
      eventId,
      seed.attemptCount,
      createdAt,
      createdAt + 600_000,
      seed.state === "verified" || seed.state === "terminal_failed"
        ? createdAt + 1
        : null,
      seed.state === "verified" ? seed.terminalAt : null,
      seed.terminalAt,
      createdAt,
      seed.deletionEligibleAt,
    ),
  ]);
}

function id(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `00000000-0000-4000-8000-${hash.toString(16).padStart(16, "0").slice(-12)}`;
}
