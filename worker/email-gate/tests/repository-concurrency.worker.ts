import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  EMAIL_GATE_PROVIDER_LEASE_MS,
  EMAIL_GATE_RESERVATION_MS,
} from "../model";
import {
  createEmailGateRepository,
  type NewPendingChallengeInput,
} from "../repository/email-gate-repository";

const NOW = 1_800_000_000_000;

describe("Email Gate issuance authority", () => {
  it("allows at most one simultaneous pending event for one email", async () => {
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    const [first, second] = await Promise.all([
      repository.createNewPending(input("a", "event-a", "same@example.com")),
      repository.createNewPending(input("b", "event-b", "same@example.com")),
    ]);
    expect([first, second].filter((value) => value !== null)).toHaveLength(1);
    expect(await count("email_gate_challenges")).toBe(1);
    expect(await count("email_gate_send_reservations")).toBe(1);
  });

  it("keeps one active plus one replacement pending and activates atomically", async () => {
    await seedChallenge({
      challengeId: id("active"),
      eventId: "active-event",
      email: "replace@example.com",
      state: "active",
      createdAt: NOW - 60_001,
      activatedAt: NOW - 60_001,
    });
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    const pending = await repository.createNewPending(
      input("pending", "pending-event", "replace@example.com"),
    );
    expect(pending?.predecessorChallengeId).toBe(id("active"));
    await expect(
      repository.reserveProviderAttempt(
        id("pending"),
        NOW,
        NOW + EMAIL_GATE_PROVIDER_LEASE_MS,
      ),
    ).resolves.not.toBeNull();
    await expect(
      repository.activatePending(id("pending"), "replace@example.com", NOW + 1),
    ).resolves.toBe(true);
    expect((await repository.findChallenge(id("active")))?.state).toBe(
      "superseded",
    );
    expect((await repository.findChallenge(id("pending")))?.state).toBe(
      "active",
    );
  });

  it("rolls atomic replacement back when pending activation fails", async () => {
    await seedChallenge({
      challengeId: id("rollback-active"),
      eventId: "rollback-active-event",
      email: "rollback-replace@example.com",
      state: "active",
      createdAt: NOW - 60_001,
      activatedAt: NOW - 60_001,
    });
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    const pending = await repository.createNewPending(
      input(
        "rollback-pending",
        "rollback-pending-event",
        "rollback-replace@example.com",
      ),
    );
    expect(pending?.predecessorChallengeId).toBe(id("rollback-active"));

    await env.EMAIL_GATE_DB.prepare(
      `CREATE TRIGGER fail_pending_activation
       BEFORE UPDATE OF state ON email_gate_challenges
       WHEN OLD.state = 'delivery_pending' AND NEW.state = 'active'
       BEGIN SELECT RAISE(FAIL, 'test activation failure'); END;`,
    ).run();

    await expect(
      repository.activatePending(
        id("rollback-pending"),
        "rollback-replace@example.com",
        NOW + 1,
      ),
    ).resolves.toBe(false);
    expect((await repository.findChallenge(id("rollback-active")))?.state).toBe(
      "active",
    );
    expect(
      (await repository.findChallenge(id("rollback-pending")))?.state,
    ).toBe("delivery_pending");
  });

  it("transitions expired and attempt-exhausted pending rows before new issuance", async () => {
    await seedChallenge({
      challengeId: id("expired"),
      eventId: "expired-event",
      email: "a@example.com",
      state: "delivery_pending",
      createdAt: NOW - 700_000,
      expiresAt: NOW - 100_000,
    });
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await repository.settleIneligiblePending("a@example.com", NOW);
    expect((await repository.findChallenge(id("expired")))?.state).toBe(
      "expired",
    );

    await seedChallenge({
      challengeId: id("exhausted"),
      eventId: "exhausted-event",
      email: "b@example.com",
      state: "delivery_pending",
      providerAttemptCount: 3,
      providerAttemptLeaseUntil: NOW,
    });
    await repository.settleIneligiblePending("b@example.com", NOW);
    expect((await repository.findChallenge(id("exhausted")))?.state).toBe(
      "delivery_failed",
    );
  });

  it("uses strict lower bounds for cooldown and rolling windows", async () => {
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await seedChallenge({
      challengeId: id("boundary"),
      eventId: "boundary-event",
      email: "boundary@example.com",
      state: "delivery_failed",
      createdAt: NOW - 60_000,
      expiresAt: NOW + 540_000,
      terminalAt: NOW - 1,
    });
    await expect(
      repository.createNewPending(
        input("after-boundary", "after-boundary-event", "boundary@example.com"),
      ),
    ).resolves.not.toBeNull();
  });

  it("excludes events exactly on the 30-minute and 24-hour lower bounds", async () => {
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await seedCountedEvents("thirty-boundary@example.com", [
      NOW - 1_800_000,
      NOW - 1_000_000,
      NOW - 500_000,
    ]);
    expect(
      await repository.createNewPending(
        input(
          "thirty-boundary",
          "thirty-boundary-new",
          "thirty-boundary@example.com",
        ),
      ),
    ).not.toBeNull();

    await seedCountedEvents("daily-boundary@example.com", [
      NOW - 86_400_000,
      NOW - 80_000_000,
      NOW - 70_000_000,
      NOW - 60_000_000,
      NOW - 50_000_000,
      NOW - 40_000_000,
    ]);
    expect(
      await repository.createNewPending(
        input(
          "daily-boundary",
          "daily-boundary-new",
          "daily-boundary@example.com",
        ),
      ),
    ).not.toBeNull();
  });

  it("blocks the 60-second, 3/30-minute, and 6/24-hour limits", async () => {
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await seedCountedEvents("cooldown@example.com", [NOW - 59_999]);
    expect(
      await repository.createNewPending(
        input("cooldown", "cooldown-new", "cooldown@example.com"),
      ),
    ).toBeNull();

    await seedCountedEvents("thirty@example.com", [
      NOW - 60_000,
      NOW - 600_000,
      NOW - 1_799_999,
    ]);
    expect(
      await repository.createNewPending(
        input("thirty", "thirty-new", "thirty@example.com"),
      ),
    ).toBeNull();

    await seedCountedEvents("daily@example.com", [
      NOW - 60_000,
      NOW - 2_000_000,
      NOW - 4_000_000,
      NOW - 6_000_000,
      NOW - 8_000_000,
      NOW - 86_399_999,
    ]);
    expect(
      await repository.createNewPending(
        input("daily", "daily-new", "daily@example.com"),
      ),
    ).toBeNull();
  });

  it("allows exactly one concurrent reservation when global capacity is 89", async () => {
    const statements = Array.from({ length: 89 }, (_, index) =>
      env.EMAIL_GATE_DB.prepare(
        `INSERT INTO email_gate_send_reservations
         (provider_send_event_id, reserved_at, expires_at)
         VALUES (?, ?, ?)`,
      ).bind(`seed-${index}`, NOW, NOW + EMAIL_GATE_RESERVATION_MS),
    );
    await env.EMAIL_GATE_DB.batch(statements);
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    const results = await Promise.all([
      repository.createNewPending(
        input("cap-a", "cap-event-a", "a@example.com"),
      ),
      repository.createNewPending(
        input("cap-b", "cap-event-b", "b@example.com"),
      ),
    ]);
    expect(results.filter((value) => value !== null)).toHaveLength(1);
    expect(await count("email_gate_send_reservations")).toBe(90);
  });

  it("rejects a new event when all 90 rolling reservations are occupied", async () => {
    const statements = Array.from({ length: 90 }, (_, index) =>
      env.EMAIL_GATE_DB.prepare(
        `INSERT INTO email_gate_send_reservations
         (provider_send_event_id, reserved_at, expires_at)
         VALUES (?, ?, ?)`,
      ).bind(`full-${index}`, NOW, NOW + EMAIL_GATE_RESERVATION_MS),
    );
    await env.EMAIL_GATE_DB.batch(statements);

    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await expect(
      repository.createNewPending(
        input("cap-full", "cap-full-event", "full@example.com"),
      ),
    ).resolves.toBeNull();
    expect(await count("email_gate_send_reservations")).toBe(90);
    expect(await count("email_gate_challenges")).toBe(0);
  });

  it("rolls reservation creation back when per-email authority rejects", async () => {
    await seedCountedEvents("blocked@example.com", [NOW - 1]);
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    expect(
      await repository.createNewPending(
        input("blocked", "blocked-event", "blocked@example.com"),
      ),
    ).toBeNull();
    const reservation = await env.EMAIL_GATE_DB.prepare(
      `SELECT provider_send_event_id FROM email_gate_send_reservations
       WHERE provider_send_event_id = 'blocked-event'`,
    ).first();
    expect(reservation).toBeNull();
  });
});

describe("provider attempt lease", () => {
  it("allows one concurrent attempt, retries after lease expiry, and never exceeds three", async () => {
    const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
    await repository.createNewPending(
      input("lease", "lease-event", "a@example.com"),
    );
    const firstPair = await Promise.all([
      repository.reserveProviderAttempt(
        id("lease"),
        NOW,
        NOW + EMAIL_GATE_PROVIDER_LEASE_MS,
      ),
      repository.reserveProviderAttempt(
        id("lease"),
        NOW,
        NOW + EMAIL_GATE_PROVIDER_LEASE_MS,
      ),
    ]);
    expect(firstPair.filter((value) => value !== null)).toHaveLength(1);
    expect(
      firstPair.find((value) => value !== null)?.providerAttemptCount,
    ).toBe(1);

    expect(
      await repository.reserveProviderAttempt(
        id("lease"),
        NOW + EMAIL_GATE_PROVIDER_LEASE_MS - 1,
        NOW + EMAIL_GATE_PROVIDER_LEASE_MS * 2,
      ),
    ).toBeNull();
    expect(
      (
        await repository.reserveProviderAttempt(
          id("lease"),
          NOW + EMAIL_GATE_PROVIDER_LEASE_MS,
          NOW + EMAIL_GATE_PROVIDER_LEASE_MS * 2,
        )
      )?.providerAttemptCount,
    ).toBe(2);
    expect(
      (
        await repository.reserveProviderAttempt(
          id("lease"),
          NOW + EMAIL_GATE_PROVIDER_LEASE_MS * 2,
          NOW + EMAIL_GATE_PROVIDER_LEASE_MS * 3,
        )
      )?.providerAttemptCount,
    ).toBe(3);
    expect(
      await repository.reserveProviderAttempt(
        id("lease"),
        NOW + EMAIL_GATE_PROVIDER_LEASE_MS * 3,
        NOW + EMAIL_GATE_PROVIDER_LEASE_MS * 4,
      ),
    ).toBeNull();
  });
});

function input(
  suffix: string,
  eventId: string,
  email: string,
): NewPendingChallengeInput {
  return Object.freeze({
    challengeId: id(suffix),
    normalizedEmail: email,
    otpKeyVersion: 1,
    providerSendEventId: eventId,
    deliveryPayloadVersion: 1,
    createdAt: NOW,
    expiresAt: NOW + 600_000,
  });
}

function id(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `00000000-0000-4000-8000-${hash.toString(16).padStart(16, "0").slice(-12)}`;
}

interface SeedChallenge {
  readonly challengeId: string;
  readonly eventId: string;
  readonly email: string;
  readonly state: "delivery_pending" | "active" | "delivery_failed";
  readonly createdAt?: number;
  readonly expiresAt?: number;
  readonly activatedAt?: number | null;
  readonly terminalAt?: number | null;
  readonly providerAttemptCount?: number;
  readonly providerAttemptLeaseUntil?: number | null;
}

async function seedChallenge(seed: SeedChallenge): Promise<void> {
  const createdAt = seed.createdAt ?? NOW - 1_000;
  const expiresAt = seed.expiresAt ?? createdAt + 600_000;
  const providerAttemptCount =
    seed.providerAttemptCount ?? (seed.state === "delivery_pending" ? 0 : 1);
  const terminalAt =
    seed.terminalAt ?? (seed.state === "delivery_failed" ? NOW - 1 : null);
  await env.EMAIL_GATE_DB.prepare(
    `INSERT INTO email_gate_challenges (
       challenge_id, normalized_email, state, otp_key_version,
       provider_send_event_id, delivery_payload_version,
       provider_attempt_count, provider_attempt_lease_until, attempt_count,
       created_at, expires_at, activated_at, terminal_at,
       last_provider_attempt_at, deletion_eligible_at
     ) VALUES (?, ?, ?, 1, ?, 1, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      seed.challengeId,
      seed.email,
      seed.state,
      seed.eventId,
      providerAttemptCount,
      seed.providerAttemptLeaseUntil ?? null,
      createdAt,
      expiresAt,
      seed.activatedAt ?? (seed.state === "active" ? NOW - 500 : null),
      terminalAt,
      providerAttemptCount > 0 ? createdAt : null,
      terminalAt === null ? null : terminalAt + 604_800_000,
    )
    .run();
}

async function seedCountedEvents(
  email: string,
  createdTimes: readonly number[],
): Promise<void> {
  for (const [index, createdAt] of createdTimes.entries()) {
    await seedChallenge({
      challengeId: id(`${email}-${index}`),
      eventId: `${email}-${index}`,
      email,
      state: "delivery_failed",
      createdAt,
      expiresAt: createdAt + 600_000,
      terminalAt: createdAt + 1,
    });
  }
}

async function count(table: string): Promise<number> {
  const result = await env.EMAIL_GATE_DB.prepare(
    `SELECT COUNT(*) AS count FROM ${table}`,
  ).first<Readonly<{ count: number }>>();
  return result?.count ?? 0;
}
