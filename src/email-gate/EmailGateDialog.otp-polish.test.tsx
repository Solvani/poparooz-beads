import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailGateCapability } from "./email-gate-capability";
import type { EmailGateBrowserClient } from "./email-gate-client";
import { EmailGateDialog } from "./EmailGateDialog";

const CHALLENGE_ID = "abcdefab-cdef-4abc-8def-abcdefabcdef";
type EnabledCapability = Extract<
  EmailGateCapability,
  { availability: { available: true } }
>;

function capability(
  overrides: Partial<EmailGateBrowserClient> = {},
): EnabledCapability {
  return {
    availability: { available: true },
    issueProofProvider: {
      getFreshIssueToken: vi.fn(async () => "synthetic-local-proof"),
    },
    unlockStore: {
      isUnlocked: vi.fn(() => false),
      writeUnlocked: vi.fn(() => true),
    },
    client: {
      issueChallenge: vi.fn(async () => ({
        ok: true as const,
        response: {
          schemaVersion: 1 as const,
          result: "challenge_issued" as const,
          challengeId: CHALLENGE_ID,
          expiresInSeconds: 580,
          resendAfterSeconds: 45,
        },
      })),
      verifyChallenge: vi.fn(async () => ({
        ok: true as const,
        response: {
          schemaVersion: 1 as const,
          result: "verification_succeeded" as const,
          verified: true as const,
        },
      })),
      ...overrides,
    },
  };
}

function renderDialog(enabled: EnabledCapability) {
  const onClose = vi.fn();
  const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
  const view = render(
    <EmailGateDialog
      capability={enabled}
      patternReplaced={false}
      marketingConsentAvailable
      onClose={onClose}
      onVerified={onVerified}
    />,
  );
  return { ...view, onClose, onVerified };
}

async function enterCode(enabled = capability(), user = userEvent.setup()) {
  const view = renderDialog(enabled);
  await user.type(
    screen.getByLabelText("Email address"),
    "synthetic@example.invalid",
  );
  await user.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  const input = await screen.findByLabelText("6-digit verification code");
  return { ...view, enabled, user, input };
}

function slots() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".email-gate-code-slots span"),
  );
}

beforeEach(() => {
  document.body.innerHTML =
    '<button id="opener">Download</button><main class="app-root"></main>';
  document.getElementById("opener")?.focus();
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(0), 0),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("OTP modal presentation preserves the existing native input", () => {
  it("scopes polish to Step 2 and renders six visual cells, not six new inputs", async () => {
    const { input } = await enterCode();
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-step",
      "verification",
    );
    expect(slots()).toHaveLength(6);
    expect(document.querySelector(".email-gate-code-slots")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(input).toHaveAttribute("maxlength", "6");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveFocus();
    expect(slots()[0]).toHaveAttribute("data-active", "true");
    expect(slots().every((slot) => slot.textContent === "")).toBe(true);
    expect(
      screen.getByRole("button", { name: "Verify & download" }),
    ).toBeDisabled();
  });

  it("advances the visual position while preserving native focus and explicit submission", async () => {
    const { input, user, enabled } = await enterCode();
    for (const [index, digit] of Array.from("012345").entries()) {
      await user.type(input, digit);
      expect(input).toHaveFocus();
      expect(slots()[index]).toHaveTextContent(digit);
      expect(slots()[index]).toHaveAttribute("data-filled", "true");
      expect(slots()[Math.min(index + 1, 5)]).toHaveAttribute(
        "data-active",
        "true",
      );
      if (index < 5)
        expect(
          screen.getByRole("button", { name: "Verify & download" }),
        ).toBeDisabled();
    }
    expect(
      screen.getByRole("button", { name: "Verify & download" }),
    ).toBeEnabled();
    expect(enabled.client.verifyChallenge).not.toHaveBeenCalled();
  });

  it("pastes all six digits without auto-submitting and keeps the exact verify payload", async () => {
    const { input, user, enabled, onVerified } = await enterCode();
    await user.click(input);
    await user.paste("012345");
    expect(input).toHaveValue("012345");
    expect(
      slots()
        .map((slot) => slot.textContent)
        .join(""),
    ).toBe("012345");
    expect(enabled.client.verifyChallenge).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Verify & download" }));
    expect(enabled.client.verifyChallenge).toHaveBeenCalledExactlyOnceWith(
      { challengeId: CHALLENGE_ID, code: "012345" },
      expect.any(AbortSignal),
    );
    expect(onVerified).toHaveBeenCalledExactlyOnceWith({
      challengeId: CHALLENGE_ID,
      marketingConsent: false,
    });
  });

  it("preserves digit filtering and the six-character bound", async () => {
    const { input } = await enterCode();
    fireEvent.change(input, { target: { value: "a01 2-3x456789" } });
    expect(input).toHaveValue("012345");
    expect(slots()).toHaveLength(6);
    expect(
      slots()
        .map((slot) => slot.textContent)
        .join(""),
    ).toBe("012345");
  });

  it("preserves native Backspace, including empty input, without moving focus out", async () => {
    const { input, user, enabled } = await enterCode();
    await user.type(input, "012345");
    await user.keyboard("{Backspace}{Backspace}");
    expect(input).toHaveValue("0123");
    expect(input).toHaveFocus();
    expect(slots()[4]).toHaveAttribute("data-active", "true");
    expect(slots()[4]).toHaveAttribute("data-filled", "false");
    expect(
      screen.getByRole("button", { name: "Verify & download" }),
    ).toBeDisabled();
    await user.clear(input);
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(slots()[0]).toHaveAttribute("data-active", "true");
    expect(enabled.client.verifyChallenge).not.toHaveBeenCalled();
  });

  it("keeps the existing error announcement and associates the visual error with the native input", async () => {
    const { input, user } = await enterCode(
      capability({
        verifyChallenge: vi.fn(async () => ({
          ok: true as const,
          response: {
            schemaVersion: 1 as const,
            result: "verification_invalid" as const,
          },
        })),
      }),
    );
    await user.type(input, "012345");
    await user.click(screen.getByRole("button", { name: "Verify & download" }));
    const error = await screen.findByText(
      "The code is incorrect. Please try again.",
    );
    expect(error).toHaveAttribute("aria-live", "polite");
    expect(error).toHaveAttribute("data-tone", "error");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
    expect(slots()).toHaveLength(6);
  });

  it("preserves the exact 45-second countdown and the unchanged resend identity", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const user = userEvent.setup();
    const { enabled } = await enterCode(capability(), user);
    expect(
      screen.getByRole("button", { name: "Resend in 45s" }),
    ).toBeDisabled();
    act(() => vi.advanceTimersByTime(30_000));
    expect(
      screen.getByRole("button", { name: "Resend in 15s" }),
    ).toBeDisabled();
    act(() => vi.advanceTimersByTime(15_000));
    const resend = screen.getByRole("button", { name: "Resend code" });
    expect(resend).toBeEnabled();
    await user.click(resend);
    expect(enabled.client.issueChallenge).toHaveBeenCalledTimes(2);
    expect(enabled.client.issueChallenge).toHaveBeenLastCalledWith(
      {
        email: "synthetic@example.invalid",
        turnstileToken: "synthetic-local-proof",
      },
      expect.any(AbortSignal),
    );
    expect(
      screen.getByRole("button", { name: "Resend in 45s" }),
    ).toBeDisabled();
  });

  it("keeps Change email, privacy, optional marketing and modal focus semantics", async () => {
    const { user, onClose } = await enterCode();
    expect(screen.getByText("We respect your privacy.")).toBeInTheDocument();
    expect(screen.getByText("No account. No password.")).toBeInTheDocument();
    expect(document.querySelector(".app-root")).toHaveAttribute("inert");
    await user.click(screen.getByRole("button", { name: "Change email" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("data-step", "email");
    await waitFor(() =>
      expect(screen.getByLabelText("Email address")).toHaveFocus(),
    );
    expect(slots()).toHaveLength(0);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("OTP-only responsive style contract", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/email-gate/email-gate.css"),
    "utf8",
  );
  const mobile = css.slice(css.indexOf("@media (max-width: 720px)"));

  it("uses the approved compact desktop shell and a six-column OTP row", () => {
    expect(css).toMatch(
      /\.email-gate-dialog\[data-step="verification"\] \{\s*grid-template-columns: minmax\(0, 0\.36fr\) minmax\(0, 0\.64fr\);\s*width: min\(820px, 100%\);/,
    );
    expect(css).toMatch(
      /\.email-gate-form--code \.email-gate-code-field \{\s*width: min\(362px, 100%\);\s*min-height: 60px;/,
    );
    expect(css).toMatch(
      /\.email-gate-form--code \.email-gate-code-slots \{\s*grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);\s*gap: 10px;/,
    );
    expect(css).toContain("font-size: 30px;");
    expect(css).toContain("font-weight: 600;");
    expect(css).toMatch(
      /\.email-gate-form--code \.email-gate-primary \{\s*height: 50px;\s*margin-top: 18px;/,
    );
  });

  it("keeps all six mobile cells in one constrained row without changing Step 1 styles", () => {
    expect(mobile).toMatch(
      /\.email-gate-form--code \.email-gate-code-field \{\s*width: min\(299px, 100%\);\s*min-height: 54px;/,
    );
    expect(mobile).toMatch(
      /\.email-gate-form--code \.email-gate-code-slots \{\s*gap: 7px;/,
    );
    expect(mobile).toMatch(
      /\.email-gate-form--code \.email-gate-code-slots span \{\s*height: 54px;\s*font-size: 28px;/,
    );
    expect(css).toContain(
      "grid-template-columns: minmax(300px, 0.82fr) minmax(440px, 1.18fr);",
    );
    expect(css).toContain("width: min(940px, 100%);");
  });
});
