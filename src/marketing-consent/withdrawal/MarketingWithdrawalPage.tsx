import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import poparoozLogo from "../../assets/branding/poparooz-logo.png";
import {
  EMAIL_GATE_OTP_REGEX,
  normalizeEmailAddressV1,
} from "../../contracts/email-gate/email-gate-contract";
import { createEmailGateOperationIdentity } from "../../email-gate/operation-identity";
import { EMAIL_GATE_TURNSTILE_CONTAINER_ID } from "../../email-gate/turnstile-issue-proof-provider";
import type { MarketingWithdrawalAvailability } from "./marketing-withdrawal-availability";
import {
  INITIAL_MARKETING_WITHDRAWAL_STATE,
  UNAVAILABLE_MARKETING_WITHDRAWAL_STATE,
  marketingWithdrawalReducer,
} from "./marketing-withdrawal-reducer";
import type { MarketingWithdrawalRouteCapability } from "./production-marketing-withdrawal-verification-capability";
import "./marketing-withdrawal.css";

const VERIFIED_AUTHORITY_WINDOW_MS = 600_000;

export interface MarketingWithdrawalPageProps {
  readonly availability: MarketingWithdrawalAvailability;
  readonly capability?: MarketingWithdrawalRouteCapability;
  readonly now?: () => number;
}

export function MarketingWithdrawalPage({
  availability,
  capability = { available: false },
  now = Date.now,
}: MarketingWithdrawalPageProps) {
  const enabled = availability.enabled && capability.available;
  const [state, dispatch] = useReducer(
    marketingWithdrawalReducer,
    enabled
      ? INITIAL_MARKETING_WITHDRAWAL_STATE
      : UNAVAILABLE_MARKETING_WITHDRAWAL_STATE,
  );
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [code, setCode] = useState("");
  const [clockMs, setClockMs] = useState(now());
  const operation = useMemo(() => createEmailGateOperationIdentity(), []);
  const actionLocked = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => operation.supersede(), [operation]);

  useEffect(() => {
    if (state.challengeId === null) return;
    const timer = window.setInterval(() => {
      const currentTime = now();
      setClockMs(currentTime);
      if (
        state.expiresAtMs !== null &&
        currentTime > state.expiresAtMs &&
        ["CODE_ENTRY", "CODE_ERROR"].includes(state.phase)
      ) {
        operation.supersede();
        actionLocked.current = false;
        setCode("");
        dispatch({ type: "SHOW_CODE_EXPIRED" });
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [now, operation, state.challengeId, state.expiresAtMs, state.phase]);

  if (!enabled)
    return <UnavailableWithdrawalPage availability={availability} />;

  const verification = capability.verification;
  const withdrawal = capability.withdrawal.client;
  const resendRemaining =
    state.resendReadyAtMs === null
      ? 0
      : Math.max(0, Math.ceil((state.resendReadyAtMs - clockMs) / 1_000));

  const issueChallenge = async (normalizedEmail: string, resend: boolean) => {
    if (actionLocked.current && !resend) return;
    if (resend) {
      operation.supersede();
      actionLocked.current = false;
    }
    actionLocked.current = true;
    const current = operation.begin();
    dispatch({ type: "ISSUE_STARTED", resend });
    try {
      const turnstileToken =
        await verification.issueProofProvider.getFreshIssueToken(
          current.signal,
        );
      if (!operation.isCurrent(current.generation)) return;
      const result = await verification.client.issueChallenge(
        { email: normalizedEmail, turnstileToken },
        current.signal,
      );
      if (!operation.isCurrent(current.generation)) return;
      if (!result.ok) {
        dispatch({ type: "SHOW_SERVICE_UNAVAILABLE" });
        return;
      }
      const response = result.response;
      switch (response.result) {
        case "challenge_issued": {
          const issuedAt = now();
          setSubmittedEmail(normalizedEmail);
          setCode("");
          setClockMs(issuedAt);
          dispatch({
            type: "ISSUE_SUCCEEDED",
            challengeId: response.challengeId,
            expiresAtMs: issuedAt + response.expiresInSeconds * 1_000,
            resendReadyAtMs: issuedAt + response.resendAfterSeconds * 1_000,
          });
          return;
        }
        case "invalid_request":
          dispatch({ type: "SHOW_EMAIL_ERROR" });
          return;
        case "retry_later":
          dispatch({ type: "SHOW_RATE_LIMITED" });
          return;
        default:
          dispatch({ type: "SHOW_SERVICE_UNAVAILABLE" });
      }
    } catch {
      if (operation.isCurrent(current.generation))
        dispatch({ type: "SHOW_SERVICE_UNAVAILABLE" });
    } finally {
      if (operation.isCurrent(current.generation)) actionLocked.current = false;
    }
  };

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeEmailAddressV1(email);
    if (!normalized.ok) {
      dispatch({ type: "SHOW_EMAIL_ERROR" });
      emailRef.current?.focus();
      return;
    }
    void issueChallenge(normalized.normalizedEmail, false);
  };

  const finishWithdrawal = async (
    challengeId: string,
    generation: number,
    signal: AbortSignal,
  ) => {
    let result;
    try {
      result = await withdrawal.withdraw({ challengeId }, signal);
    } catch {
      if (operation.isCurrent(generation)) {
        actionLocked.current = false;
        dispatch({ type: "DISCARD_TO_SERVICE_UNAVAILABLE" });
      }
      return;
    }
    if (!operation.isCurrent(generation)) return;
    actionLocked.current = false;
    if (!result.ok) {
      dispatch({
        type:
          result.reason === "network" || result.reason === "timeout"
            ? "SHOW_WITHDRAWAL_RETRYABLE"
            : "DISCARD_TO_SERVICE_UNAVAILABLE",
      });
      return;
    }
    switch (result.response.result) {
      case "withdrawn":
      case "already_withdrawn":
      case "not_active":
        dispatch({ type: "SHOW_WITHDRAWAL_SUCCESS" });
        return;
      case "verification_authority_invalid":
        setCode("");
        dispatch({ type: "REQUIRE_FRESH_VERIFICATION" });
        return;
      case "service_unavailable":
        dispatch({ type: "SHOW_WITHDRAWAL_RETRYABLE" });
        return;
      default:
        dispatch({ type: "DISCARD_TO_SERVICE_UNAVAILABLE" });
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!EMAIL_GATE_OTP_REGEX.test(code)) {
      dispatch({ type: "SHOW_CODE_ERROR" });
      codeRef.current?.focus();
      return;
    }
    if (state.challengeId === null || actionLocked.current) return;
    actionLocked.current = true;
    const challengeId = state.challengeId;
    const current = operation.begin();
    const verificationAttemptStartedAt = now();
    dispatch({ type: "VERIFY_STARTED" });
    let result;
    try {
      result = await verification.client.verifyChallenge(
        { challengeId, code },
        current.signal,
      );
    } catch {
      if (operation.isCurrent(current.generation)) {
        actionLocked.current = false;
        dispatch({ type: "SHOW_SERVICE_UNAVAILABLE" });
      }
      return;
    }
    if (!operation.isCurrent(current.generation)) return;
    if (!result.ok) {
      actionLocked.current = false;
      dispatch({ type: "SHOW_SERVICE_UNAVAILABLE" });
      return;
    }
    switch (result.response.result) {
      case "verification_succeeded": {
        const reuseDeadlineMs =
          verificationAttemptStartedAt + VERIFIED_AUTHORITY_WINDOW_MS;
        dispatch({ type: "WITHDRAWAL_STARTED", reuseDeadlineMs });
        await finishWithdrawal(challengeId, current.generation, current.signal);
        return;
      }
      case "verification_invalid":
        actionLocked.current = false;
        dispatch({ type: "SHOW_CODE_ERROR" });
        return;
      case "verification_expired":
        actionLocked.current = false;
        setCode("");
        dispatch({ type: "SHOW_CODE_EXPIRED" });
        return;
      case "verification_locked":
        actionLocked.current = false;
        setCode("");
        dispatch({ type: "SHOW_CODE_LOCKED" });
        return;
      case "retry_later":
        actionLocked.current = false;
        dispatch({ type: "SHOW_RATE_LIMITED" });
        return;
      default:
        actionLocked.current = false;
        dispatch({ type: "SHOW_SERVICE_UNAVAILABLE" });
    }
  };

  const resend = () => {
    if (resendRemaining > 0 || submittedEmail === "") return;
    void issueChallenge(submittedEmail, true);
  };

  const requestNewCode = () => {
    if (submittedEmail === "") return;
    void issueChallenge(submittedEmail, true);
  };

  const changeEmail = () => {
    operation.supersede();
    actionLocked.current = false;
    setCode("");
    setSubmittedEmail("");
    dispatch({ type: "CHANGE_EMAIL" });
    window.requestAnimationFrame(() => emailRef.current?.focus());
  };

  const retryWithdrawal = () => {
    if (
      state.challengeId === null ||
      state.withdrawalReuseDeadlineMs === null ||
      actionLocked.current
    )
      return;
    if (now() > state.withdrawalReuseDeadlineMs) {
      setCode("");
      dispatch({ type: "REQUIRE_FRESH_VERIFICATION" });
      return;
    }
    actionLocked.current = true;
    const current = operation.begin();
    dispatch({ type: "WITHDRAWAL_RETRY_STARTED" });
    void finishWithdrawal(
      state.challengeId,
      current.generation,
      current.signal,
    );
  };

  const codeFlow =
    state.challengeId !== null &&
    [
      "CODE_ENTRY",
      "CODE_VERIFYING",
      "CODE_ERROR",
      "RATE_LIMITED",
      "SERVICE_UNAVAILABLE",
    ].includes(state.phase);

  return (
    <WithdrawalShell availability={availability} phase={state.phase}>
      {state.phase === "WITHDRAWAL_SUCCESS" ? (
        <SuccessContent />
      ) : state.phase === "WITHDRAWAL_PENDING" ? (
        <StatusContent
          heading="Updating your preferences"
          message="Please keep this page open for a moment."
        />
      ) : state.phase === "WITHDRAWAL_RETRYABLE" ? (
        <StatusContent
          heading="We could not confirm the update"
          message="You can safely try again while this verification is still valid."
          action={<button onClick={retryWithdrawal}>Try update again</button>}
        />
      ) : state.phase === "CODE_EXPIRED" || state.phase === "CODE_LOCKED" ? (
        <StatusContent
          heading={
            state.phase === "CODE_EXPIRED"
              ? "That code has expired"
              : "That code can no longer be used"
          }
          message="Request a new verification code to continue."
          action={<button onClick={requestNewCode}>Request new code</button>}
          secondary={<button onClick={changeEmail}>Change email</button>}
        />
      ) : codeFlow ? (
        <form className="marketing-withdrawal-form" onSubmit={submitCode}>
          <p className="marketing-withdrawal-eyebrow">Verify your email</p>
          <h1 id="marketing-withdrawal-heading">Enter your 8-digit code.</h1>
          <p className="marketing-withdrawal-message">
            We sent a fresh verification code to {submittedEmail}.
          </p>
          <label htmlFor="withdrawal-code">Verification code</label>
          <input
            ref={codeRef}
            id="withdrawal-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{8}"
            maxLength={8}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
            }
            aria-invalid={state.phase === "CODE_ERROR"}
          />
          {state.phase === "CODE_ERROR" && (
            <p className="marketing-withdrawal-error" role="alert">
              Enter the valid 8-digit verification code.
            </p>
          )}
          {state.phase === "RATE_LIMITED" && (
            <p className="marketing-withdrawal-error" role="status">
              Too many attempts. Please wait before trying again.
            </p>
          )}
          {state.phase === "SERVICE_UNAVAILABLE" && (
            <p className="marketing-withdrawal-error" role="status">
              Verification is temporarily unavailable. Please try again.
            </p>
          )}
          <button type="submit" disabled={state.phase === "CODE_VERIFYING"}>
            {state.phase === "CODE_VERIFYING" ? "Verifying…" : "Verify email"}
          </button>
          <div className="marketing-withdrawal-secondary-actions">
            <button
              type="button"
              onClick={resend}
              disabled={resendRemaining > 0}
            >
              {resendRemaining > 0
                ? `Resend in ${resendRemaining}s`
                : "Resend code"}
            </button>
            <button type="button" onClick={changeEmail}>
              Change email
            </button>
          </div>
          <p className="marketing-withdrawal-privacy">
            No account. No password.
          </p>
        </form>
      ) : (
        <form className="marketing-withdrawal-form" onSubmit={submitEmail}>
          <p className="marketing-withdrawal-eyebrow">Email preferences</p>
          <h1 id="marketing-withdrawal-heading">
            Unsubscribe from Poparooz emails.
          </h1>
          <p className="marketing-withdrawal-message">
            Verify your email to update your marketing preferences privately.
          </p>
          <label htmlFor="withdrawal-email">Email address</label>
          <input
            ref={emailRef}
            id="withdrawal-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={state.phase === "EMAIL_ERROR"}
          />
          {state.phase === "EMAIL_ERROR" && (
            <p className="marketing-withdrawal-error" role="alert">
              Enter a valid email address.
            </p>
          )}
          {state.phase === "RATE_LIMITED" && (
            <p className="marketing-withdrawal-error" role="status">
              Too many requests. Please wait before trying again.
            </p>
          )}
          {state.phase === "SERVICE_UNAVAILABLE" && (
            <p className="marketing-withdrawal-error" role="status">
              Verification is temporarily unavailable. Please try again later.
            </p>
          )}
          <button type="submit" disabled={state.phase === "EMAIL_SUBMITTING"}>
            {state.phase === "EMAIL_SUBMITTING"
              ? "Sending…"
              : "Send verification code"}
          </button>
          <p className="marketing-withdrawal-privacy">
            No account. No password.
          </p>
        </form>
      )}
      <div
        id={EMAIL_GATE_TURNSTILE_CONTAINER_ID}
        className="marketing-withdrawal-turnstile"
        aria-live="polite"
      />
    </WithdrawalShell>
  );
}

function UnavailableWithdrawalPage({
  availability,
}: Readonly<{ availability: MarketingWithdrawalAvailability }>) {
  return (
    <WithdrawalShell availability={availability} phase="FEATURE_UNAVAILABLE">
      <p className="marketing-withdrawal-eyebrow">Email preferences</p>
      <h1 id="marketing-withdrawal-heading">
        Marketing preferences are temporarily unavailable.
      </h1>
      <p className="marketing-withdrawal-message" role="status">
        Please try again later. Your existing email preferences have not been
        changed.
      </p>
      <p className="marketing-withdrawal-privacy">No account. No password.</p>
      <a className="marketing-withdrawal-home" href="/">
        Return to Pattern Maker
      </a>
    </WithdrawalShell>
  );
}

function WithdrawalShell({
  availability,
  phase,
  children,
}: Readonly<{
  availability: MarketingWithdrawalAvailability;
  phase: string;
  children: ReactNode;
}>) {
  return (
    <main
      className="marketing-withdrawal-page"
      data-foundation-enabled={availability.enabled ? "true" : "false"}
      data-feature-state={phase}
    >
      <section
        className="marketing-withdrawal-card"
        aria-labelledby="marketing-withdrawal-heading"
      >
        <img
          className="marketing-withdrawal-logo"
          src={poparoozLogo}
          alt="Poparooz"
        />
        {children}
      </section>
    </main>
  );
}

function StatusContent({
  heading,
  message,
  action,
  secondary,
}: Readonly<{
  heading: string;
  message: string;
  action?: ReactNode;
  secondary?: ReactNode;
}>) {
  return (
    <div className="marketing-withdrawal-status">
      <p className="marketing-withdrawal-eyebrow">Email preferences</p>
      <h1 id="marketing-withdrawal-heading">{heading}</h1>
      <p className="marketing-withdrawal-message" role="status">
        {message}
      </p>
      {action}
      {secondary}
      <p className="marketing-withdrawal-privacy">No account. No password.</p>
    </div>
  );
}

function SuccessContent() {
  return (
    <div className="marketing-withdrawal-status">
      <p className="marketing-withdrawal-eyebrow">Preferences updated</p>
      <h1 id="marketing-withdrawal-heading">
        Your marketing preferences are updated.
      </h1>
      <p className="marketing-withdrawal-message" role="status">
        You will not receive Poparooz marketing emails from this subscription.
      </p>
      <p className="marketing-withdrawal-privacy">No account. No password.</p>
      <a className="marketing-withdrawal-home" href="/">
        Return to Pattern Maker
      </a>
    </div>
  );
}
