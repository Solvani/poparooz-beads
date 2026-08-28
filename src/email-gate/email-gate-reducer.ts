export type EmailGatePhase =
  | "email-entry"
  | "issuing"
  | "code-entry"
  | "verifying"
  | "invalid-code"
  | "expired"
  | "locked"
  | "temporary-unavailable"
  | "success"
  | "persistence-warning"
  | "pattern-replaced";

export interface EmailGateState {
  readonly phase: EmailGatePhase;
  readonly challengeId: string | null;
  readonly resendAfterSeconds: number;
}

export type EmailGateAction =
  | Readonly<{ type: "ISSUE_STARTED" }>
  | Readonly<{
      type: "ISSUE_SUCCEEDED";
      challengeId: string;
      resendAfterSeconds: number;
    }>
  | Readonly<{ type: "VERIFY_STARTED" }>
  | Readonly<{
      type: "SHOW";
      phase: Exclude<EmailGatePhase, "issuing" | "verifying">;
    }>
  | Readonly<{ type: "TICK" }>
  | Readonly<{ type: "CHANGE_EMAIL" }>;

export const INITIAL_EMAIL_GATE_STATE: EmailGateState = Object.freeze({
  phase: "email-entry",
  challengeId: null,
  resendAfterSeconds: 0,
});

export function emailGateReducer(
  state: EmailGateState,
  action: EmailGateAction,
): EmailGateState {
  switch (action.type) {
    case "ISSUE_STARTED":
      return { ...state, phase: "issuing" };
    case "ISSUE_SUCCEEDED":
      return {
        phase: "code-entry",
        challengeId: action.challengeId,
        resendAfterSeconds: action.resendAfterSeconds,
      };
    case "VERIFY_STARTED":
      return state.challengeId === null
        ? state
        : { ...state, phase: "verifying" };
    case "SHOW":
      return { ...state, phase: action.phase };
    case "TICK":
      return {
        ...state,
        resendAfterSeconds: Math.max(0, state.resendAfterSeconds - 1),
      };
    case "CHANGE_EMAIL":
      return INITIAL_EMAIL_GATE_STATE;
  }
}
