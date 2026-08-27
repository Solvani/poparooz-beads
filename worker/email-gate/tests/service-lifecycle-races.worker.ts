import { env } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

import { createOtpKeyRegistry, decodeHexKey, deriveOtpV1 } from "../crypto/otp";
import {
  createDeliveryPayloadRendererRegistry,
  createTestFixtureRenderer,
} from "../delivery/payload-renderer";
import { PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1 } from "../delivery/production-renderer-v1";
import type { ProviderSendResult } from "../model";
import { createEmailGateRepository } from "../repository/email-gate-repository";
import {
  createEmailGateService,
  type EmailGateService,
} from "../service/email-gate-service";

const TEST_KEY = decodeHexKey(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
)!;
const START = 1_800_000_000_000;
const CHALLENGE_A = "00000000-0000-4000-8000-000000000000";
const EVENT_A = "10000000-0000-4000-8000-000000000000";

describe("Email Gate service lifecycle", () => {
  it("issues, activates, verifies once, and never persists raw OTP", async () => {
    const fixture = createFixture(["accepted"]);
    const issued = await fixture.service.issue(issueRequest());
    expect(issued).toEqual({
      result: "challenge_issued",
      challengeId: CHALLENGE_A,
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
    expect(fixture.turnstile.validate).toHaveBeenCalledOnce();
    expect(fixture.resend.send).toHaveBeenCalledOnce();

    const columns = await env.EMAIL_GATE_DB.prepare(
      "PRAGMA table_info(email_gate_challenges)",
    ).all<Readonly<{ name: string }>>();
    expect(columns.results.map((row) => row.name)).not.toEqual(
      expect.arrayContaining(["otp", "code", "turnstile_token"]),
    );

    const key = await fixture.otpKeys.getKey(1);
    const code = await deriveOtpV1(key!, CHALLENGE_A);
    await expect(
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code,
      }),
    ).resolves.toBe("verification_succeeded");
    await expect(
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code,
      }),
    ).resolves.toBe("verification_invalid");
  });

  it("reconstructs an identical production payload for same-event recovery", async () => {
    const fixture = createFixture(["ambiguous", "accepted"], {
      productionRenderer: true,
    });
    await expect(fixture.service.issue(issueRequest())).resolves.toEqual({
      result: "retry_later",
    });
    fixture.advance(15_000);
    const recovered = await fixture.service.issue(issueRequest("fresh-token"));
    expect(recovered.result).toBe("challenge_issued");
    expect(recovered.challengeId).toBe(CHALLENGE_A);
    expect(fixture.turnstile.validate).toHaveBeenCalledTimes(2);
    expect(fixture.resend.send).toHaveBeenCalledTimes(2);
    expect(fixture.resend.send.mock.calls[0]?.[0]).toBe(
      fixture.resend.send.mock.calls[1]?.[0],
    );
    expect(fixture.resend.send.mock.calls[0]?.[1]).toEqual(
      fixture.resend.send.mock.calls[1]?.[1],
    );
    expect(JSON.stringify(fixture.resend.send.mock.calls[0]?.[1])).toBe(
      JSON.stringify(fixture.resend.send.mock.calls[1]?.[1]),
    );
    expect(fixture.resend.send.mock.calls[0]?.[1]).toMatchObject({
      from: "Poparooz <verification@notify.poparooz.com>",
      replyTo: "poparooz2026@gmail.com",
      to: ["User@example.com"],
      subject: "Your Poparooz verification code",
    });
    const reservations = await env.EMAIL_GATE_DB.prepare(
      "SELECT COUNT(*) AS count FROM email_gate_send_reservations",
    ).first<Readonly<{ count: number }>>();
    expect(reservations?.count).toBe(1);
  });

  it.each([
    ["definite_reject", "service_unavailable", "delivery_failed"],
    ["changed_payload_conflict", "service_unavailable", "delivery_failed"],
    ["concurrent_idempotency_conflict", "retry_later", "delivery_pending"],
    ["ambiguous", "retry_later", "delivery_pending"],
  ] as const)(
    "maps provider outcome %s without activating",
    async (outcome, result, state) => {
      const fixture = createFixture([outcome]);
      await expect(fixture.service.issue(issueRequest())).resolves.toEqual({
        result,
      });
      expect((await fixture.repository.findChallenge(CHALLENGE_A))?.state).toBe(
        state,
      );
    },
  );

  it("fails closed on a missing renderer and makes no provider call", async () => {
    const fixture = createFixture(["accepted"], { renderer: false });
    await expect(fixture.service.issue(issueRequest())).resolves.toEqual({
      result: "service_unavailable",
    });
    expect(fixture.resend.send).not.toHaveBeenCalled();
  });

  it("fails closed on a missing key and makes no provider call", async () => {
    const missingKey = createFixture(["accepted"], { key: false });
    await expect(missingKey.service.issue(issueRequest())).resolves.toEqual({
      result: "service_unavailable",
    });
    expect(missingKey.resend.send).not.toHaveBeenCalled();
  });

  it("uses response-time ceilings after provider latency", async () => {
    const fixture = createFixture(["accepted"], {
      onSend: () => fixture.advance(1_001),
    });
    await expect(fixture.service.issue(issueRequest())).resolves.toMatchObject({
      expiresInSeconds: 599,
      resendAfterSeconds: 59,
    });
  });

  it("expires an accepted provider response that crosses the deadline", async () => {
    const expired = createFixture(["accepted"], {
      onSend: () => expired.advance(600_000),
    });
    await expect(expired.service.issue(issueRequest())).resolves.toEqual({
      result: "service_unavailable",
    });
    expect((await expired.repository.findChallenge(CHALLENGE_A))?.state).toBe(
      "expired",
    );
  });

  it.each(["definite_reject", "changed_payload_conflict"] as const)(
    "keeps expiry authoritative over provider outcome %s",
    async (outcome) => {
      const fixture = createFixture([outcome], {
        onSend: () => fixture.advance(600_000),
      });
      await expect(fixture.service.issue(issueRequest())).resolves.toEqual({
        result: "service_unavailable",
      });
      expect((await fixture.repository.findChallenge(CHALLENGE_A))?.state).toBe(
        "expired",
      );
    },
  );

  it("expires a third ambiguous attempt that crosses the deadline", async () => {
    let sendCount = 0;
    const fixture = createFixture(["ambiguous", "ambiguous", "ambiguous"], {
      onSend: () => {
        sendCount += 1;
        if (sendCount === 3) fixture.advance(570_000);
      },
    });
    await expect(fixture.service.issue(issueRequest())).resolves.toEqual({
      result: "retry_later",
    });
    fixture.advance(15_000);
    await expect(
      fixture.service.issue(issueRequest("retry-2")),
    ).resolves.toEqual({ result: "retry_later" });
    fixture.advance(15_000);
    await expect(
      fixture.service.issue(issueRequest("retry-3")),
    ).resolves.toEqual({ result: "service_unavailable" });
    const row = await fixture.repository.findChallenge(CHALLENGE_A);
    expect(row?.providerAttemptCount).toBe(3);
    expect(row?.state).toBe("expired");
  });

  it("reconciles a provider-crossing expiry as verification_expired", async () => {
    const fixture = createFixture(["definite_reject"], {
      onSend: () => fixture.advance(600_000),
    });
    await fixture.service.issue(issueRequest());
    await expect(fixture.service.scheduled()).resolves.toBe(1);
    const aggregate = await env.EMAIL_GATE_DB.prepare(
      `SELECT verification_expired AS verificationExpired,
              delivery_failures AS deliveryFailures
       FROM email_gate_daily_aggregates`,
    ).first<
      Readonly<{
        verificationExpired: number;
        deliveryFailures: number;
      }>
    >();
    expect(aggregate).toEqual({
      verificationExpired: 1,
      deliveryFailures: 0,
    });
  });

  it("fails closed after provider acceptance when D1 activation fails", async () => {
    const fixture = createFixture(["accepted"], {
      onSend: async () => {
        await env.EMAIL_GATE_DB.prepare(
          `CREATE TRIGGER fail_activation
           BEFORE UPDATE OF state ON email_gate_challenges
           WHEN OLD.state = 'delivery_pending' AND NEW.state = 'active'
           BEGIN SELECT RAISE(FAIL, 'test activation failure'); END;`,
        ).run();
      },
    });
    await expect(fixture.service.issue(issueRequest())).resolves.toEqual({
      result: "service_unavailable",
    });
    await env.EMAIL_GATE_DB.prepare("DROP TRIGGER fail_activation").run();
    const row = await fixture.repository.findChallenge(CHALLENGE_A);
    expect(row?.state).toBe("delivery_pending");
    expect(row?.providerAttemptCount).toBe(1);
    expect(fixture.resend.send).toHaveBeenCalledOnce();
  });

  it("makes no provider call when the attempt reservation affects zero rows", async () => {
    await env.EMAIL_GATE_DB.prepare(
      `CREATE TRIGGER ignore_attempt_reservation
       BEFORE UPDATE OF provider_attempt_count ON email_gate_challenges
       BEGIN SELECT RAISE(IGNORE); END;`,
    ).run();
    const fixture = createFixture(["accepted"]);
    await expect(fixture.service.issue(issueRequest())).resolves.toEqual({
      result: "retry_later",
    });
    await env.EMAIL_GATE_DB.prepare(
      "DROP TRIGGER ignore_attempt_reservation",
    ).run();
    expect(fixture.resend.send).not.toHaveBeenCalled();
    expect(
      (await fixture.repository.findChallenge(CHALLENGE_A))
        ?.providerAttemptCount,
    ).toBe(0);
  });

  it("commits wrong attempts 1 through 5 and locks on the fifth", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(
        fixture.service.verify({
          schemaVersion: 1,
          challengeId: CHALLENGE_A,
          code: "99999999",
        }),
      ).resolves.toBe("verification_invalid");
    }
    await expect(
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code: "99999999",
      }),
    ).resolves.toBe("verification_locked");
    const row = await fixture.repository.findChallenge(CHALLENGE_A);
    expect(row?.attemptCount).toBe(5);
    expect(row?.state).toBe("terminal_failed");
  });

  it("allows exactly one of two simultaneous correct verifications", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());
    const key = await fixture.otpKeys.getKey(1);
    const code = await deriveOtpV1(key!, CHALLENGE_A);
    const results = await Promise.all([
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code,
      }),
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code,
      }),
    ]);
    expect(
      results.filter((result) => result === "verification_succeeded"),
    ).toHaveLength(1);
    expect(results).toContain("verification_invalid");
  });

  it("expires at the exact server-authoritative deadline", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());
    const key = await fixture.otpKeys.getKey(1);
    const code = await deriveOtpV1(key!, CHALLENGE_A);
    fixture.advance(600_000);
    await expect(
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code,
      }),
    ).resolves.toBe("verification_expired");
    expect((await fixture.repository.findChallenge(CHALLENGE_A))?.state).toBe(
      "expired",
    );
  });

  it("maps a correct-code race lost to expiry as verification_expired", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());
    const key = await fixture.otpKeys.getKey(1);
    const code = await deriveOtpV1(key!, CHALLENGE_A);

    let releaseVerification!: () => void;
    let signalVerificationStarted!: () => void;
    const verificationStarted = new Promise<void>((resolve) => {
      signalVerificationStarted = resolve;
    });
    const verificationRelease = new Promise<void>((resolve) => {
      releaseVerification = resolve;
    });
    const racingRepository = Object.freeze({
      ...fixture.repository,
      async verifyActive(
        challengeId: string,
        expectedRowVersion: number,
        now: number,
      ) {
        signalVerificationStarted();
        await verificationRelease;
        return fixture.repository.verifyActive(
          challengeId,
          expectedRowVersion,
          now,
        );
      },
    });
    const racingService = createEmailGateService({
      repository: racingRepository,
      turnstile: fixture.turnstile,
      resend: Object.freeze({
        send: async () => Object.freeze({ outcome: "ambiguous" as const }),
      }),
      otpKeys: fixture.otpKeys,
      payloadRenderers: createDeliveryPayloadRendererRegistry(1, [
        createTestFixtureRenderer(1),
      ]),
      now: () => START,
      randomUuid: () => "unused",
    });

    const verification = racingService.verify({
      schemaVersion: 1,
      challengeId: CHALLENGE_A,
      code,
    });
    await verificationStarted;
    await fixture.repository.expireChallenge(CHALLENGE_A, START + 600_000);
    releaseVerification();

    await expect(verification).resolves.toBe("verification_expired");
    expect((await fixture.repository.findChallenge(CHALLENGE_A))?.state).toBe(
      "expired",
    );
  });

  it("uses a fresh post-reread clock when an active lost race crosses expiry", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());

    const race = await runInjectedVerificationLostRace(fixture, {
      mutationNow: START + 599_999,
      rereadNow: START + 600_000,
      transition: "active",
    });

    expect(race.result).toBe("verification_expired");
    expect(race.findChallenge).toHaveBeenCalledTimes(2);
    expect(race.now).toHaveBeenCalledTimes(3);
  });

  it("returns retry_later when an active lost race remains unexpired after reread", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());

    const race = await runInjectedVerificationLostRace(fixture, {
      mutationNow: START + 599_998,
      rereadNow: START + 599_999,
      transition: "active",
    });

    expect(race.result).toBe("retry_later");
    expect(race.findChallenge).toHaveBeenCalledTimes(2);
    expect(race.now).toHaveBeenCalledTimes(3);
  });

  it("maps an authoritative terminal_failed lost-race reread to verification_locked", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());
    await env.EMAIL_GATE_DB.prepare(
      "UPDATE email_gate_challenges SET attempt_count = 4 WHERE challenge_id = ?",
    )
      .bind(CHALLENGE_A)
      .run();

    const race = await runInjectedVerificationLostRace(fixture, {
      mutationNow: START + 1,
      rereadNow: START + 2,
      transition: "terminal_failed",
    });

    expect(race.result).toBe("verification_locked");
    expect(race.findChallenge).toHaveBeenCalledTimes(2);
  });

  it("maps an authoritative verified lost-race reread to verification_invalid", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());

    const race = await runInjectedVerificationLostRace(fixture, {
      mutationNow: START + 1,
      rereadNow: START + 2,
      transition: "verified",
    });

    expect(race.result).toBe("verification_invalid");
    expect(race.findChallenge).toHaveBeenCalledTimes(2);
  });

  it("maps simultaneous fifth wrong attempts to one terminal authority", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());
    await env.EMAIL_GATE_DB.prepare(
      `UPDATE email_gate_challenges
       SET attempt_count = 4 WHERE challenge_id = ?`,
    )
      .bind(CHALLENGE_A)
      .run();
    const results = await Promise.all([
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code: "99999999",
      }),
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code: "99999999",
      }),
    ]);
    expect(results).toEqual(["verification_locked", "verification_locked"]);
    expect(
      (await fixture.repository.findChallenge(CHALLENGE_A))?.attemptCount,
    ).toBe(5);
  });

  it("keeps an active challenge valid when a replacement delivery fails", async () => {
    const fixture = createFixture(["accepted", "definite_reject"]);
    await fixture.service.issue(issueRequest());
    fixture.advance(60_000);
    await fixture.service.issue(issueRequest("replacement-token"));
    expect((await fixture.repository.findChallenge(CHALLENGE_A))?.state).toBe(
      "active",
    );
    const key = await fixture.otpKeys.getKey(1);
    const code = await deriveOtpV1(key!, CHALLENGE_A);
    await expect(
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code,
      }),
    ).resolves.toBe("verification_succeeded");
  });

  it("supersedes the old challenge only when its replacement activates", async () => {
    const fixture = createFixture(["accepted", "accepted"]);
    await fixture.service.issue(issueRequest());
    fixture.advance(60_000);
    const replacement = await fixture.service.issue(
      issueRequest("replacement-token"),
    );
    expect(replacement.result).toBe("challenge_issued");
    expect((await fixture.repository.findChallenge(CHALLENGE_A))?.state).toBe(
      "superseded",
    );
    const key = await fixture.otpKeys.getKey(1);
    const oldCode = await deriveOtpV1(key!, CHALLENGE_A);
    await expect(
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code: oldCode,
      }),
    ).resolves.toBe("verification_invalid");
  });

  it("expires a prior active challenge that reaches expiry during replacement delivery", async () => {
    let sendCount = 0;
    const fixture = createFixture(["accepted", "accepted"], {
      onSend: () => {
        sendCount += 1;
        if (sendCount === 2) fixture.advance(20);
      },
    });
    await fixture.service.issue(issueRequest());
    fixture.advance(599_990);
    const replacement = await fixture.service.issue(
      issueRequest("replacement-token"),
    );
    expect(replacement.result).toBe("challenge_issued");
    expect((await fixture.repository.findChallenge(CHALLENGE_A))?.state).toBe(
      "expired",
    );
    expect(
      (
        await fixture.repository.findChallenge(
          "00000000-0000-4000-8000-000000000001",
        )
      )?.state,
    ).toBe("active");
  });

  it("resolves correct-code versus fifth-wrong races to one final authority", async () => {
    const fixture = createFixture(["accepted"]);
    await fixture.service.issue(issueRequest());
    await env.EMAIL_GATE_DB.prepare(
      "UPDATE email_gate_challenges SET attempt_count = 4 WHERE challenge_id = ?",
    )
      .bind(CHALLENGE_A)
      .run();
    const key = await fixture.otpKeys.getKey(1);
    const code = await deriveOtpV1(key!, CHALLENGE_A);
    const results = await Promise.all([
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code,
      }),
      fixture.service.verify({
        schemaVersion: 1,
        challengeId: CHALLENGE_A,
        code: "99999999",
      }),
    ]);
    const final = await fixture.repository.findChallenge(CHALLENGE_A);
    expect(["verified", "terminal_failed"]).toContain(final?.state);
    if (final?.state === "verified") {
      expect(results).toContain("verification_succeeded");
      expect(results).toContain("verification_invalid");
    } else {
      expect(results).toEqual(["verification_locked", "verification_locked"]);
    }
  });
});

function issueRequest(turnstileToken = "token") {
  return Object.freeze({
    schemaVersion: 1 as const,
    email: "User@example.com",
    turnstileToken,
  });
}

function createFixture(
  outcomes: readonly ProviderSendResult["outcome"][],
  options: Readonly<{
    key?: boolean;
    renderer?: boolean;
    productionRenderer?: boolean;
    onSend?: () => void | Promise<void>;
  }> = {},
): Fixture {
  let currentTime = START;
  const ids = [
    CHALLENGE_A,
    EVENT_A,
    "00000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000001",
  ];
  const turnstile = Object.freeze({ validate: vi.fn(async () => true) });
  const outcomeQueue = [...outcomes];
  const resend = Object.freeze({
    send: vi.fn(async () => {
      await options.onSend?.();
      return Object.freeze({ outcome: outcomeQueue.shift() ?? "ambiguous" });
    }),
  });
  const otpKeys = createOtpKeyRegistry(
    1,
    options.key === false ? new Map() : new Map([[1, TEST_KEY]]),
  );
  const payloadRenderers = createDeliveryPayloadRendererRegistry(
    1,
    options.renderer === false
      ? []
      : [
          options.productionRenderer === true
            ? PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1
            : createTestFixtureRenderer(1),
        ],
  );
  const repository = createEmailGateRepository(env.EMAIL_GATE_DB);
  const service = createEmailGateService({
    repository,
    turnstile,
    resend,
    otpKeys,
    payloadRenderers,
    now: () => currentTime,
    randomUuid: () => ids.shift()!,
  });
  return {
    service,
    repository,
    otpKeys,
    turnstile,
    resend,
    advance(milliseconds: number) {
      currentTime += milliseconds;
    },
  };
}

interface Fixture {
  readonly service: EmailGateService;
  readonly repository: ReturnType<typeof createEmailGateRepository>;
  readonly otpKeys: ReturnType<typeof createOtpKeyRegistry>;
  readonly turnstile: Readonly<{
    validate: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
  }>;
  readonly resend: Readonly<{
    send: ReturnType<typeof vi.fn>;
  }>;
  advance(milliseconds: number): void;
}

async function runInjectedVerificationLostRace(
  fixture: Fixture,
  options: Readonly<{
    mutationNow: number;
    rereadNow: number;
    transition: "active" | "terminal_failed" | "verified";
  }>,
) {
  const findChallenge = vi.fn((challengeId: string) =>
    fixture.repository.findChallenge(challengeId),
  );
  const racingRepository = Object.freeze({
    ...fixture.repository,
    findChallenge,
    async verifyActive(
      challengeId: string,
      expectedRowVersion: number,
      mutationNow: number,
    ) {
      if (options.transition === "verified") {
        await fixture.repository.verifyActive(
          challengeId,
          expectedRowVersion,
          mutationNow,
        );
      } else if (options.transition === "terminal_failed") {
        await fixture.repository.recordWrongAttempt(
          challengeId,
          expectedRowVersion,
          4,
          mutationNow,
        );
      }
      return false;
    },
  });
  const now = vi
    .fn<() => number>()
    .mockReturnValueOnce(START)
    .mockReturnValueOnce(options.mutationNow)
    .mockReturnValueOnce(options.rereadNow);
  const service = createEmailGateService({
    repository: racingRepository,
    turnstile: fixture.turnstile,
    resend: Object.freeze({
      send: async () => Object.freeze({ outcome: "ambiguous" as const }),
    }),
    otpKeys: fixture.otpKeys,
    payloadRenderers: createDeliveryPayloadRendererRegistry(1, [
      createTestFixtureRenderer(1),
    ]),
    now,
    randomUuid: () => "unused",
  });
  const key = await fixture.otpKeys.getKey(1);
  const code = await deriveOtpV1(key!, CHALLENGE_A);

  return Object.freeze({
    result: await service.verify({
      schemaVersion: 1,
      challengeId: CHALLENGE_A,
      code,
    }),
    findChallenge,
    now,
  });
}
