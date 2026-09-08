import { describe, expect, it } from "vitest";

import {
  INITIAL_MARKETING_WITHDRAWAL_STATE,
  marketingWithdrawalReducer,
} from "./marketing-withdrawal-reducer";

const issued = marketingWithdrawalReducer(INITIAL_MARKETING_WITHDRAWAL_STATE, {
  type: "ISSUE_SUCCEEDED",
  challengeId: "challenge-a",
  expiresAtMs: 20_000,
  resendReadyAtMs: 5_000,
});

describe("marketing withdrawal reducer", () => {
  it("records a newly issued challenge and its in-memory deadlines", () => {
    expect(issued).toEqual({
      phase: "CODE_ENTRY",
      challengeId: "challenge-a",
      expiresAtMs: 20_000,
      resendReadyAtMs: 5_000,
      resendState: "RESEND_COOLDOWN",
      withdrawalReuseDeadlineMs: null,
    });
  });

  it("makes issue, verification, resend, and withdrawal transitions explicit", () => {
    expect(
      marketingWithdrawalReducer(INITIAL_MARKETING_WITHDRAWAL_STATE, {
        type: "ISSUE_STARTED",
        resend: false,
      }).phase,
    ).toBe("EMAIL_SUBMITTING");
    expect(
      marketingWithdrawalReducer(issued, {
        type: "ISSUE_STARTED",
        resend: true,
      }).resendState,
    ).toBe("RESEND_SUBMITTING");
    expect(
      marketingWithdrawalReducer(issued, { type: "VERIFY_STARTED" }).phase,
    ).toBe("CODE_VERIFYING");

    const pending = marketingWithdrawalReducer(issued, {
      type: "WITHDRAWAL_STARTED",
      reuseDeadlineMs: 610_000,
    });
    expect(pending.phase).toBe("WITHDRAWAL_PENDING");
    expect(pending.withdrawalReuseDeadlineMs).toBe(610_000);
    expect(
      marketingWithdrawalReducer(pending, {
        type: "SHOW_WITHDRAWAL_RETRYABLE",
      }).phase,
    ).toBe("WITHDRAWAL_RETRYABLE");
    expect(
      marketingWithdrawalReducer(pending, {
        type: "SHOW_WITHDRAWAL_SUCCESS",
      }).phase,
    ).toBe("WITHDRAWAL_SUCCESS");
  });

  it.each([
    ["SHOW_CODE_ERROR", "CODE_ERROR"],
    ["SHOW_RATE_LIMITED", "RATE_LIMITED"],
    ["SHOW_SERVICE_UNAVAILABLE", "SERVICE_UNAVAILABLE"],
  ] as const)("maps %s without discarding current authority", (type, phase) => {
    const next = marketingWithdrawalReducer(issued, { type });
    expect(next.phase).toBe(phase);
    expect(next.challengeId).toBe("challenge-a");
  });

  it.each([
    ["SHOW_CODE_EXPIRED", "CODE_EXPIRED"],
    ["SHOW_CODE_LOCKED", "CODE_LOCKED"],
    ["REQUIRE_FRESH_VERIFICATION", "EMAIL_ENTRY"],
    ["CHANGE_EMAIL", "EMAIL_ENTRY"],
  ] as const)("maps %s and discards all challenge authority", (type, phase) => {
    const next = marketingWithdrawalReducer(
      {
        ...issued,
        withdrawalReuseDeadlineMs: 610_000,
      },
      { type },
    );
    expect(next.phase).toBe(phase);
    expect(next.challengeId).toBeNull();
    expect(next.expiresAtMs).toBeNull();
    expect(next.withdrawalReuseDeadlineMs).toBeNull();
  });

  it("can fail closed while discarding verified authority", () => {
    const next = marketingWithdrawalReducer(
      { ...issued, withdrawalReuseDeadlineMs: 610_000 },
      { type: "DISCARD_TO_SERVICE_UNAVAILABLE" },
    );
    expect(next.phase).toBe("SERVICE_UNAVAILABLE");
    expect(next.challengeId).toBeNull();
    expect(next.withdrawalReuseDeadlineMs).toBeNull();
  });
});
