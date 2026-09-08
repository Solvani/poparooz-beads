export type MarketingWithdrawalPhase =
  | "FEATURE_UNAVAILABLE"
  | "EMAIL_ENTRY"
  | "EMAIL_SUBMITTING"
  | "EMAIL_ERROR"
  | "CODE_ENTRY"
  | "CODE_VERIFYING"
  | "CODE_ERROR"
  | "CODE_EXPIRED"
  | "CODE_LOCKED"
  | "RATE_LIMITED"
  | "WITHDRAWAL_PENDING"
  | "WITHDRAWAL_RETRYABLE"
  | "WITHDRAWAL_SUCCESS"
  | "SERVICE_UNAVAILABLE";

export type MarketingWithdrawalResendState =
  "RESEND_READY" | "RESEND_SUBMITTING" | "RESEND_COOLDOWN" | "RESEND_ERROR";

export interface MarketingWithdrawalState {
  readonly phase: MarketingWithdrawalPhase;
  readonly challengeId: string | null;
  readonly expiresAtMs: number | null;
  readonly resendReadyAtMs: number | null;
  readonly resendState: MarketingWithdrawalResendState;
  readonly withdrawalReuseDeadlineMs: number | null;
}

export type MarketingWithdrawalAction =
  | Readonly<{ type: "ISSUE_STARTED"; resend: boolean }>
  | Readonly<{
      type: "ISSUE_SUCCEEDED";
      challengeId: string;
      expiresAtMs: number;
      resendReadyAtMs: number;
    }>
  | Readonly<{ type: "SHOW_EMAIL_ERROR" }>
  | Readonly<{ type: "VERIFY_STARTED" }>
  | Readonly<{ type: "SHOW_CODE_ERROR" }>
  | Readonly<{ type: "SHOW_CODE_EXPIRED" }>
  | Readonly<{ type: "SHOW_CODE_LOCKED" }>
  | Readonly<{ type: "SHOW_RATE_LIMITED" }>
  | Readonly<{ type: "SHOW_SERVICE_UNAVAILABLE" }>
  | Readonly<{ type: "DISCARD_TO_SERVICE_UNAVAILABLE" }>
  | Readonly<{
      type: "WITHDRAWAL_STARTED";
      reuseDeadlineMs: number;
    }>
  | Readonly<{ type: "WITHDRAWAL_RETRY_STARTED" }>
  | Readonly<{ type: "SHOW_WITHDRAWAL_RETRYABLE" }>
  | Readonly<{ type: "SHOW_WITHDRAWAL_SUCCESS" }>
  | Readonly<{ type: "REQUIRE_FRESH_VERIFICATION" }>
  | Readonly<{ type: "CHANGE_EMAIL" }>;

export const UNAVAILABLE_MARKETING_WITHDRAWAL_STATE: MarketingWithdrawalState =
  Object.freeze({
    phase: "FEATURE_UNAVAILABLE",
    challengeId: null,
    expiresAtMs: null,
    resendReadyAtMs: null,
    resendState: "RESEND_READY",
    withdrawalReuseDeadlineMs: null,
  });

export const INITIAL_MARKETING_WITHDRAWAL_STATE: MarketingWithdrawalState =
  Object.freeze({
    ...UNAVAILABLE_MARKETING_WITHDRAWAL_STATE,
    phase: "EMAIL_ENTRY",
  });

function discardAuthority(
  phase: MarketingWithdrawalPhase,
): MarketingWithdrawalState {
  return {
    ...INITIAL_MARKETING_WITHDRAWAL_STATE,
    phase,
  };
}

export function marketingWithdrawalReducer(
  state: MarketingWithdrawalState,
  action: MarketingWithdrawalAction,
): MarketingWithdrawalState {
  switch (action.type) {
    case "ISSUE_STARTED":
      return {
        ...state,
        phase: "EMAIL_SUBMITTING",
        resendState: action.resend ? "RESEND_SUBMITTING" : state.resendState,
      };
    case "ISSUE_SUCCEEDED":
      return {
        phase: "CODE_ENTRY",
        challengeId: action.challengeId,
        expiresAtMs: action.expiresAtMs,
        resendReadyAtMs: action.resendReadyAtMs,
        resendState: "RESEND_COOLDOWN",
        withdrawalReuseDeadlineMs: null,
      };
    case "SHOW_EMAIL_ERROR":
      return discardAuthority("EMAIL_ERROR");
    case "VERIFY_STARTED":
      return state.challengeId === null
        ? state
        : { ...state, phase: "CODE_VERIFYING" };
    case "SHOW_CODE_ERROR":
      return { ...state, phase: "CODE_ERROR" };
    case "SHOW_CODE_EXPIRED":
      return discardAuthority("CODE_EXPIRED");
    case "SHOW_CODE_LOCKED":
      return discardAuthority("CODE_LOCKED");
    case "SHOW_RATE_LIMITED":
      return { ...state, phase: "RATE_LIMITED" };
    case "SHOW_SERVICE_UNAVAILABLE":
      return { ...state, phase: "SERVICE_UNAVAILABLE" };
    case "DISCARD_TO_SERVICE_UNAVAILABLE":
      return discardAuthority("SERVICE_UNAVAILABLE");
    case "WITHDRAWAL_STARTED":
      return {
        ...state,
        phase: "WITHDRAWAL_PENDING",
        withdrawalReuseDeadlineMs: action.reuseDeadlineMs,
      };
    case "WITHDRAWAL_RETRY_STARTED":
      return { ...state, phase: "WITHDRAWAL_PENDING" };
    case "SHOW_WITHDRAWAL_RETRYABLE":
      return { ...state, phase: "WITHDRAWAL_RETRYABLE" };
    case "SHOW_WITHDRAWAL_SUCCESS":
      return { ...state, phase: "WITHDRAWAL_SUCCESS" };
    case "REQUIRE_FRESH_VERIFICATION":
      return discardAuthority("EMAIL_ENTRY");
    case "CHANGE_EMAIL":
      return INITIAL_MARKETING_WITHDRAWAL_STATE;
  }
}
