import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import poparoozLogoUrl from "../assets/branding/poparooz-logo.png";
import editorialFloralUrl from "../assets/branding/email-gate-editorial-floral.webp";
import {
  EMAIL_GATE_OTP_REGEX,
  normalizeEmailAddressV1,
} from "../contracts/email-gate/email-gate-contract";
import type { EmailGateCapability } from "./email-gate-capability";
import {
  INITIAL_EMAIL_GATE_STATE,
  emailGateReducer,
  type EmailGatePhase,
} from "./email-gate-reducer";
import type { EmailGateCompletion } from "./download-coordinator";
import { createEmailGateOperationIdentity } from "./operation-identity";
import "./email-gate.css";

export interface EmailGateDialogProps {
  readonly capability: Extract<
    EmailGateCapability,
    { availability: { available: true } }
  >;
  readonly patternReplaced: boolean;
  readonly onClose: () => void;
  readonly onVerified: () => Promise<EmailGateCompletion>;
}

export function EmailGateDialog({
  capability,
  patternReplaced,
  onClose,
  onVerified,
}: EmailGateDialogProps) {
  const titleId = useId();
  const instructionsId = useId();
  const statusId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [issueOperation] = useState(createEmailGateOperationIdentity);
  const [verifyOperation] = useState(createEmailGateOperationIdentity);
  const completionStarted = useRef(false);
  const [state, dispatch] = useReducer(
    emailGateReducer,
    INITIAL_EMAIL_GATE_STATE,
  );
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (state.resendAfterSeconds <= 0) return;
    const timer = window.setInterval(() => dispatch({ type: "TICK" }), 1_000);
    return () => window.clearInterval(timer);
  }, [state.resendAfterSeconds]);

  useEffect(() => {
    if (!patternReplaced) return;
    issueOperation.supersede();
    verifyOperation.supersede();
    dispatch({ type: "SHOW", phase: "pattern-replaced" });
  }, [issueOperation, patternReplaced, verifyOperation]);

  useEffect(() => {
    const background = document.querySelector<HTMLElement>(".app-root");
    const previousAriaHidden = background?.getAttribute("aria-hidden") ?? null;
    const previouslyInert = background?.hasAttribute("inert") ?? false;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const bodyStyle = document.body.getAttribute("style");
    const scrollY = window.scrollY;
    background?.setAttribute("inert", "");
    background?.setAttribute("aria-hidden", "true");
    Object.assign(document.body.style, {
      position: "fixed",
      overflow: "hidden",
      top: `-${scrollY}px`,
      width: "100%",
    });
    window.requestAnimationFrame(() => emailRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      issueOperation.supersede();
      verifyOperation.supersede();
      document.removeEventListener("keydown", onKeyDown);
      if (background) {
        if (previousAriaHidden === null)
          background.removeAttribute("aria-hidden");
        else background.setAttribute("aria-hidden", previousAriaHidden);
        if (!previouslyInert) background.removeAttribute("inert");
      }
      if (bodyStyle === null) document.body.removeAttribute("style");
      else document.body.setAttribute("style", bodyStyle);
      window.scrollTo(0, scrollY);
      previousFocus?.focus();
    };
  }, [issueOperation, onClose, verifyOperation]);

  useEffect(() => {
    if (state.phase === "code-entry" || state.phase === "invalid-code") {
      codeRef.current?.focus();
    }
  }, [state.phase]);

  const issueChallenge = async (normalizedEmail: string) => {
    const operation = issueOperation.begin();
    verifyOperation.supersede();
    dispatch({ type: "ISSUE_STARTED" });
    try {
      const turnstileToken =
        await capability.issueProofProvider.getFreshIssueToken(
          operation.signal,
        );
      if (!issueOperation.isCurrent(operation.generation)) return;
      const result = await capability.client.issueChallenge(
        { email: normalizedEmail, turnstileToken },
        operation.signal,
      );
      if (!issueOperation.isCurrent(operation.generation)) return;
      if (!result.ok) {
        dispatch({ type: "SHOW", phase: "temporary-unavailable" });
        return;
      }
      const response = result.response;
      if (response.result === "challenge_issued") {
        setSubmittedEmail(normalizedEmail);
        setCode("");
        dispatch({
          type: "ISSUE_SUCCEEDED",
          challengeId: response.challengeId,
          resendAfterSeconds: response.resendAfterSeconds,
        });
      } else {
        dispatch({
          type: "SHOW",
          phase: "temporary-unavailable",
        });
      }
    } catch {
      if (issueOperation.isCurrent(operation.generation)) {
        dispatch({ type: "SHOW", phase: "temporary-unavailable" });
      }
    }
  };

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeEmailAddressV1(email);
    if (!normalized.ok) {
      setEmailError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    setEmailError(null);
    void issueChallenge(normalized.normalizedEmail);
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !EMAIL_GATE_OTP_REGEX.test(code) ||
      state.challengeId === null ||
      completionStarted.current
    ) {
      if (!EMAIL_GATE_OTP_REGEX.test(code)) {
        dispatch({ type: "SHOW", phase: "invalid-code" });
        codeRef.current?.focus();
      }
      return;
    }
    completionStarted.current = true;
    const operation = verifyOperation.begin();
    dispatch({ type: "VERIFY_STARTED" });
    const result = await capability.client.verifyChallenge(
      { challengeId: state.challengeId, code },
      operation.signal,
    );
    if (!verifyOperation.isCurrent(operation.generation)) return;
    if (!result.ok) {
      completionStarted.current = false;
      dispatch({ type: "SHOW", phase: "temporary-unavailable" });
      return;
    }
    switch (result.response.result) {
      case "verification_succeeded": {
        const completion = await onVerified();
        if (!verifyOperation.isCurrent(operation.generation)) return;
        dispatch({
          type: "SHOW",
          phase: completionPhase(completion),
        });
        return;
      }
      case "verification_invalid":
        completionStarted.current = false;
        dispatch({ type: "SHOW", phase: "invalid-code" });
        return;
      case "verification_expired":
        completionStarted.current = false;
        dispatch({ type: "SHOW", phase: "expired" });
        return;
      case "verification_locked":
        completionStarted.current = false;
        dispatch({ type: "SHOW", phase: "locked" });
        return;
      default:
        completionStarted.current = false;
        dispatch({ type: "SHOW", phase: "temporary-unavailable" });
    }
  };

  const changeEmail = () => {
    issueOperation.supersede();
    verifyOperation.supersede();
    completionStarted.current = false;
    setCode("");
    dispatch({ type: "CHANGE_EMAIL" });
    window.requestAnimationFrame(() => emailRef.current?.focus());
  };

  return createPortal(
    <div className="email-gate-backdrop">
      <div
        ref={dialogRef}
        className="email-gate-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${instructionsId} ${statusId}`}
      >
        <aside className="email-gate-editorial" aria-hidden="true">
          <img
            className="email-gate-editorial__photo"
            src={editorialFloralUrl}
            alt=""
          />
          <div className="email-gate-editorial__copy">
            <img
              className="email-gate-editorial__logo"
              src={poparoozLogoUrl}
              alt=""
            />
            <p className="email-gate-editorial__eyebrow">Pattern download</p>
            <p className="email-gate-editorial__headline">
              Your pattern is almost yours.
            </p>
            <p className="email-gate-editorial__body">
              A small step to unlock your high-quality download.
            </p>
          </div>
        </aside>

        <section className="email-gate-workflow">
          <header className="email-gate-workflow__header">
            <img
              className="email-gate-workflow__logo"
              src={poparoozLogoUrl}
              alt="Poparooz"
            />
            <button
              type="button"
              className="email-gate-close"
              onClick={onClose}
            >
              Close
            </button>
          </header>

          <div className="email-gate-workflow__content">
            <p className="email-gate-step">
              {isEmailPhase(state.phase, state.challengeId)
                ? "Step 1 of 2"
                : "Step 2 of 2"}
              <span>Verify your email to download</span>
            </p>
            <h2 id={titleId}>{titleFor(state.phase, state.challengeId)}</h2>
            <p id={instructionsId} className="email-gate-instructions">
              {instructionsFor(state.phase, submittedEmail, state.challengeId)}
            </p>

            <div
              id={statusId}
              className="email-gate-status"
              data-tone={statusToneFor(state.phase)}
              aria-live="polite"
            >
              {statusFor(state.phase)}
            </div>

            {isEmailPhase(state.phase, state.challengeId) ? (
              <form
                className="email-gate-form"
                onSubmit={submitEmail}
                noValidate
              >
                <label htmlFor="email-gate-email">Email address</label>
                <input
                  ref={emailRef}
                  id="email-gate-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  aria-invalid={emailError !== null}
                  aria-describedby={
                    emailError ? "email-gate-email-error" : undefined
                  }
                  disabled={state.phase === "issuing"}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError(null);
                  }}
                />
                {emailError ? (
                  <p
                    id="email-gate-email-error"
                    className="email-gate-error"
                    role="alert"
                  >
                    {emailError}
                  </p>
                ) : null}
                <button
                  className="email-gate-primary"
                  type="submit"
                  disabled={state.phase === "issuing"}
                >
                  {state.phase === "issuing"
                    ? "Sending code…"
                    : "Send verification code"}
                </button>
              </form>
            ) : null}

            {isCodePhase(state.phase, state.challengeId) ? (
              <form className="email-gate-form" onSubmit={submitCode}>
                <label className="visually-hidden" htmlFor="email-gate-code">
                  8-digit verification code
                </label>
                <div className="email-gate-code-field">
                  <input
                    ref={codeRef}
                    id="email-gate-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={code}
                    aria-invalid={state.phase === "invalid-code"}
                    onChange={(event) =>
                      setCode(
                        event.target.value.replace(/[^0-9]/g, "").slice(0, 8),
                      )
                    }
                  />
                  <div className="email-gate-code-slots" aria-hidden="true">
                    {Array.from({ length: 8 }, (_, index) => (
                      <span key={index}>{code[index] ?? ""}</span>
                    ))}
                  </div>
                </div>
                <button
                  className="email-gate-primary"
                  type="submit"
                  disabled={state.phase === "verifying" || code.length !== 8}
                >
                  {state.phase === "verifying"
                    ? "Verifying…"
                    : "Verify & download"}
                </button>
                <button
                  type="button"
                  className="email-gate-secondary"
                  disabled={
                    state.resendAfterSeconds > 0 || state.phase === "verifying"
                  }
                  onClick={() => void issueChallenge(submittedEmail)}
                >
                  {state.resendAfterSeconds > 0
                    ? `Resend in ${state.resendAfterSeconds}s`
                    : "Resend code"}
                </button>
                <button
                  type="button"
                  className="email-gate-secondary"
                  onClick={changeEmail}
                >
                  Change email
                </button>
              </form>
            ) : null}

            {isRecoveryPhase(state.phase) ? (
              <div className="email-gate-form">
                {state.phase !== "pattern-replaced" ? (
                  <button
                    type="button"
                    className="email-gate-primary"
                    onClick={() => void issueChallenge(submittedEmail || email)}
                  >
                    Request a new code
                  </button>
                ) : null}
                <button
                  type="button"
                  className="email-gate-secondary"
                  onClick={changeEmail}
                >
                  {state.phase === "pattern-replaced"
                    ? "Return to email"
                    : "Change email"}
                </button>
              </div>
            ) : null}

            {state.phase === "success" ||
            state.phase === "persistence-warning" ? (
              <button
                type="button"
                className="email-gate-secondary"
                onClick={onClose}
              >
                Close
              </button>
            ) : null}
          </div>

          <footer className="email-gate-footer">
            <p>
              <strong>We respect your privacy.</strong>
              <br />
              Your email is used only for this verification flow.
            </p>
            <p>No account. No password.</p>
          </footer>
        </section>
      </div>
    </div>,
    document.body,
  );
}

function completionPhase(
  completion: EmailGateCompletion,
): Exclude<EmailGatePhase, "issuing" | "verifying"> {
  switch (completion.outcome) {
    case "downloaded":
      return "success";
    case "persistence-warning":
      return "persistence-warning";
    case "pattern-replaced":
      return "pattern-replaced";
    case "download-failed":
      return "temporary-unavailable";
  }
}

function isEmailPhase(phase: EmailGatePhase, challengeId: string | null) {
  return (
    phase === "email-entry" || (phase === "issuing" && challengeId === null)
  );
}

function isCodePhase(phase: EmailGatePhase, challengeId: string | null) {
  return (
    ["code-entry", "verifying", "invalid-code"].includes(phase) ||
    (phase === "issuing" && challengeId !== null)
  );
}

function isRecoveryPhase(phase: EmailGatePhase) {
  return [
    "expired",
    "locked",
    "temporary-unavailable",
    "pattern-replaced",
  ].includes(phase);
}

function titleFor(phase: EmailGatePhase, challengeId: string | null) {
  if (isEmailPhase(phase, challengeId)) return "Unlock your pattern download";
  if (phase === "success") return "Email verified";
  if (phase === "persistence-warning") return "Download unlocked for now";
  if (phase === "pattern-replaced") return "Your pattern changed";
  return "Enter the 8-digit code";
}

function instructionsFor(
  phase: EmailGatePhase,
  email: string,
  challengeId: string | null,
) {
  if (isEmailPhase(phase, challengeId))
    return "Enter your email and we’ll send a one-time verification code.";
  if (phase === "success") return "Your original pattern download is ready.";
  if (phase === "persistence-warning")
    return "Your download started, but this browser may ask you to verify again.";
  if (phase === "pattern-replaced")
    return "The pattern you asked to download is no longer current. Choose Download again for the new pattern.";
  return email
    ? `We sent a code to ${email}.`
    : "Enter the code from your email.";
}

function statusFor(phase: EmailGatePhase) {
  switch (phase) {
    case "issuing":
      return "Sending your verification code.";
    case "verifying":
      return "Verifying your code.";
    case "invalid-code":
      return "The code is incorrect. Please try again.";
    case "expired":
      return "This code has expired. Please request a new one.";
    case "locked":
      return "This code can no longer be used. Please request a new one.";
    case "temporary-unavailable":
      return "Verification is temporarily unavailable. Please try again.";
    case "success":
      return "Email verified. Your download has started.";
    case "persistence-warning":
      return "Your current download has started, but the unlock could not be saved.";
    case "pattern-replaced":
      return "No download was started.";
    default:
      return "";
  }
}

type EmailGateStatusTone =
  "neutral" | "progress" | "error" | "success" | "warning";

function statusToneFor(phase: EmailGatePhase): EmailGateStatusTone {
  switch (phase) {
    case "issuing":
    case "verifying":
      return "progress";
    case "invalid-code":
    case "expired":
    case "locked":
    case "temporary-unavailable":
    case "pattern-replaced":
      return "error";
    case "success":
      return "success";
    case "persistence-warning":
      return "warning";
    case "email-entry":
    case "code-entry":
      return "neutral";
  }
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
}
