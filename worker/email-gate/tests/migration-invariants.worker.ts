import { applyD1Migrations, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Email Gate D1 migration", () => {
  it("applies from empty storage and creates only the three frozen tables", async () => {
    const tables = await env.EMAIL_GATE_DB.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name LIKE 'email_gate_%'
       ORDER BY name`,
    ).all<Readonly<{ name: string }>>();
    expect(tables.results.map((row) => row.name)).toEqual([
      "email_gate_challenges",
      "email_gate_daily_aggregates",
      "email_gate_send_reservations",
    ]);
  });

  it("creates the required uniqueness, rolling, expiry, and reconciliation indexes", async () => {
    const indexes = await env.EMAIL_GATE_DB.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'index' AND name LIKE 'email_gate_%'
       ORDER BY name`,
    ).all<Readonly<{ name: string }>>();
    expect(indexes.results.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "email_gate_challenges_deletion_due",
        "email_gate_challenges_email_created",
        "email_gate_challenges_one_active_per_email",
        "email_gate_challenges_one_pending_per_email",
        "email_gate_challenges_reconciliation_due",
        "email_gate_challenges_state_expiry",
        "email_gate_send_reservations_expiry",
      ]),
    );
  });

  it("enforces challenge and provider event identity uniqueness", async () => {
    await insertChallenge("00000000-0000-4000-8000-000000000001", "event-1");
    await expect(
      insertChallenge("00000000-0000-4000-8000-000000000001", "event-2"),
    ).rejects.toThrow();
    await expect(
      insertChallenge("00000000-0000-4000-8000-000000000002", "event-1"),
    ).rejects.toThrow();
  });

  it("enforces at most one active and one pending challenge per email", async () => {
    await insertChallenge(
      "00000000-0000-4000-8000-000000000003",
      "event-3",
      "a@example.com",
      "active",
    );
    await expect(
      insertChallenge(
        "00000000-0000-4000-8000-000000000004",
        "event-4",
        "a@example.com",
        "active",
      ),
    ).rejects.toThrow();
    await insertChallenge(
      "00000000-0000-4000-8000-000000000005",
      "event-5",
      "a@example.com",
      "delivery_pending",
    );
    await expect(
      insertChallenge(
        "00000000-0000-4000-8000-000000000006",
        "event-6",
        "a@example.com",
        "delivery_pending",
      ),
    ).rejects.toThrow();
  });

  it("accepts one active and one replacement pending for the same email", async () => {
    await insertChallenge(
      "00000000-0000-4000-8000-000000000007",
      "event-7",
      "a@example.com",
      "active",
    );
    await insertChallenge(
      "00000000-0000-4000-8000-000000000008",
      "event-8",
      "a@example.com",
      "delivery_pending",
    );
    const count = await env.EMAIL_GATE_DB.prepare(
      "SELECT COUNT(*) AS count FROM email_gate_challenges WHERE normalized_email = ?",
    )
      .bind("a@example.com")
      .first<Readonly<{ count: number }>>();
    expect(count?.count).toBe(2);
  });

  it("enforces bounded states, attempts, and reservation duration", async () => {
    await expect(
      env.EMAIL_GATE_DB.prepare(
        `INSERT INTO email_gate_challenges (
           challenge_id, normalized_email, state, otp_key_version,
           provider_send_event_id, delivery_payload_version,
           provider_attempt_count, attempt_count, created_at, expires_at
         ) VALUES (?, ?, 'unknown', 1, ?, 1, 0, 0, 0, 600000)`,
      )
        .bind("00000000-0000-4000-8000-000000000009", "a@example.com", "e9")
        .run(),
    ).rejects.toThrow();
    await expect(
      env.EMAIL_GATE_DB.prepare(
        `INSERT INTO email_gate_send_reservations (
           provider_send_event_id, reserved_at, expires_at
         ) VALUES ('event', 0, 1)`,
      ).run(),
    ).rejects.toThrow();
  });

  it.each([
    "delivery_pending",
    "active",
    "verified",
    "expired",
    "superseded",
    "terminal_failed",
    "delivery_failed",
  ] as const)("accepts a timestamp-consistent %s row", async (state) => {
    await expect(insertStateFixture(state)).resolves.toBeUndefined();
  });

  it.each([
    ["wrong fixed lifetime", "delivery_pending", { expiresAt: 600_001 }],
    [
      "provider attempts above three",
      "delivery_pending",
      { providerAttempts: 4 },
    ],
    ["wrong attempts above five", "active", { attempts: 6 }],
    ["pending terminal timestamp", "delivery_pending", { terminalAt: 2 }],
    ["verified without activation", "verified", { activatedAt: null }],
    ["verified timestamp mismatch", "verified", { verifiedAt: 3 }],
    ["expired before its expiry", "expired", { terminalAt: 599_999 }],
    [
      "terminal failure before attempt five",
      "terminal_failed",
      { attempts: 4 },
    ],
    [
      "delivery failure without terminal time",
      "delivery_failed",
      { terminalAt: null },
    ],
    [
      "reconciliation marker mismatch",
      "delivery_failed",
      { reconciledAt: 3, reconciliationVersion: null },
    ],
    ["reconciliation before terminal", "delivery_failed", { reconciledAt: 1 }],
  ] as const)(
    "rejects contradictory row: %s",
    async (_label, state, overrides) => {
      await expect(insertStateFixture(state, overrides)).rejects.toThrow();
    },
  );

  it("treats migration reapplication as a recorded no-op", async () => {
    await expect(
      applyD1Migrations(env.EMAIL_GATE_DB, env.TEST_MIGRATIONS),
    ).resolves.toBeUndefined();
    const applied = await env.EMAIL_GATE_DB.prepare(
      "SELECT COUNT(*) AS count FROM d1_migrations",
    ).first<Readonly<{ count: number }>>();
    expect(applied?.count).toBe(env.TEST_MIGRATIONS.length);
  });

  it("rolls a failing D1 batch back", async () => {
    await expect(
      env.EMAIL_GATE_DB.batch([
        env.EMAIL_GATE_DB.prepare(
          `INSERT INTO email_gate_send_reservations
           (provider_send_event_id, reserved_at, expires_at)
           VALUES ('rollback-event', 0, 86400000)`,
        ),
        env.EMAIL_GATE_DB.prepare(
          `INSERT INTO email_gate_send_reservations
           (provider_send_event_id, reserved_at, expires_at)
           VALUES ('rollback-event', 0, 86400000)`,
        ),
      ]),
    ).rejects.toThrow();
    const row = await env.EMAIL_GATE_DB.prepare(
      `SELECT provider_send_event_id FROM email_gate_send_reservations
       WHERE provider_send_event_id = 'rollback-event'`,
    ).first();
    expect(row).toBeNull();
  });
});

async function insertChallenge(
  challengeId: string,
  eventId: string,
  normalizedEmail = "unique@example.com",
  state: "delivery_pending" | "active" = "delivery_pending",
): Promise<void> {
  await env.EMAIL_GATE_DB.prepare(
    `INSERT INTO email_gate_challenges (
       challenge_id, normalized_email, state, otp_key_version,
       provider_send_event_id, delivery_payload_version,
       provider_attempt_count, attempt_count, created_at, expires_at, activated_at,
       last_provider_attempt_at
     ) VALUES (?, ?, ?, 1, ?, 1, ?, 0, 0, 600000, ?, ?)`,
  )
    .bind(
      challengeId,
      normalizedEmail,
      state,
      eventId,
      state === "active" ? 1 : 0,
      state === "active" ? 1 : null,
      state === "active" ? 0 : null,
    )
    .run();
}

type StateFixtureState =
  | "delivery_pending"
  | "active"
  | "verified"
  | "expired"
  | "superseded"
  | "terminal_failed"
  | "delivery_failed";

interface StateFixtureOverrides {
  readonly expiresAt?: number;
  readonly providerAttempts?: number;
  readonly attempts?: number;
  readonly activatedAt?: number | null;
  readonly verifiedAt?: number | null;
  readonly terminalAt?: number | null;
  readonly reconciledAt?: number | null;
  readonly reconciliationVersion?: number | null;
}

async function insertStateFixture(
  state: StateFixtureState,
  overrides: StateFixtureOverrides = {},
): Promise<void> {
  const terminal = [
    "verified",
    "expired",
    "superseded",
    "terminal_failed",
    "delivery_failed",
  ].includes(state);
  const activeDerived = [
    "active",
    "verified",
    "superseded",
    "terminal_failed",
  ].includes(state);
  const providerAttempts =
    overrides.providerAttempts ??
    (state === "delivery_pending" || state === "expired" ? 0 : 1);
  const activatedAt =
    "activatedAt" in overrides
      ? overrides.activatedAt
      : activeDerived
        ? 1
        : null;
  const verifiedAt =
    "verifiedAt" in overrides
      ? overrides.verifiedAt
      : state === "verified"
        ? 2
        : null;
  const terminalAt =
    "terminalAt" in overrides
      ? overrides.terminalAt
      : state === "expired"
        ? 600_000
        : terminal
          ? 2
          : null;
  const attempts = overrides.attempts ?? (state === "terminal_failed" ? 5 : 0);
  const reconciledAt =
    "reconciledAt" in overrides ? overrides.reconciledAt : null;
  const reconciliationVersion =
    "reconciliationVersion" in overrides
      ? overrides.reconciliationVersion
      : reconciledAt === null
        ? null
        : 1;
  await env.EMAIL_GATE_DB.prepare(
    `INSERT INTO email_gate_challenges (
       challenge_id, normalized_email, state, otp_key_version,
       provider_send_event_id, delivery_payload_version,
       provider_attempt_count, attempt_count, created_at, expires_at,
       activated_at, verified_at, terminal_at, last_provider_attempt_at,
       reconciled_at, reconciliation_version, deletion_eligible_at
     ) VALUES (?, ?, ?, 1, ?, 1, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `10000000-0000-4000-8000-${state.padEnd(12, "0").slice(0, 12)}`,
      `${state}@example.com`,
      state,
      `state-${state}`,
      providerAttempts,
      attempts,
      overrides.expiresAt ?? 600_000,
      activatedAt,
      verifiedAt,
      terminalAt,
      providerAttempts > 0 ? 0 : null,
      reconciledAt,
      reconciliationVersion,
      terminalAt === null ? null : terminalAt,
    )
    .run();
}
