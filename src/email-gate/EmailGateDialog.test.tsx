import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailGateBrowserClient } from "./email-gate-client";
import type { EmailGateCapability } from "./email-gate-capability";
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
    issueProofProvider: { getFreshIssueToken: vi.fn(async () => "proof") },
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

beforeEach(() => {
  document.body.innerHTML =
    '<button id="opener">Download</button><main class="app-root"></main>';
  document.getElementById("opener")?.focus();
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("Email Gate dialog", () => {
  it("provides modal semantics, focus entry, containment, Escape, and restoration", async () => {
    const onClose = vi.fn();
    const view = render(
      <EmailGateDialog
        capability={capability()}
        patternReplaced={false}
        onClose={onClose}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Unlock your pattern download",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.querySelector(".app-root")).toHaveAttribute("inert");
    expect(screen.getByLabelText("Email address")).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();

    view.unmount();
    expect(document.querySelector(".app-root")).not.toHaveAttribute("inert");
    expect(document.getElementById("opener")).toHaveFocus();
  });

  it("announces invalid email without issuing a challenge", async () => {
    const enabled = capability();
    render(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );
    await userEvent.type(screen.getByLabelText("Email address"), "bad address");
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email address.",
    );
    expect(enabled.client.issueChallenge).not.toHaveBeenCalled();
  });

  it("supports email, 8-digit paste, cooldown, verification, and success announcement", async () => {
    const enabled = capability();
    const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
    render(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={vi.fn()}
        onVerified={onVerified}
      />,
    );
    await userEvent.type(
      screen.getByLabelText("Email address"),
      " Name@EXAMPLE.COM ",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Enter the 8-digit code" }),
    ).toBeInTheDocument();
    expect(enabled.client.issueChallenge).toHaveBeenCalledWith(
      { email: "Name@example.com", turnstileToken: "proof" },
      expect.any(AbortSignal),
    );
    expect(
      screen.getByRole("button", { name: "Resend in 45s" }),
    ).toBeDisabled();
    const code = screen.getByLabelText("8-digit verification code");
    await userEvent.click(code);
    await userEvent.paste("01234567");
    await userEvent.click(
      screen.getByRole("button", { name: "Verify & download" }),
    );
    await waitFor(() => expect(onVerified).toHaveBeenCalledOnce());
    expect(
      await screen.findByText("Email verified. Your download has started."),
    ).toHaveAttribute("data-tone", "success");
    expect(enabled.client.verifyChallenge).toHaveBeenCalledWith(
      { challengeId: CHALLENGE_ID, code: "01234567" },
      expect.any(AbortSignal),
    );
  });

  it("invalidates the challenge when the email changes", async () => {
    const enabled = capability();
    render(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "a@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await screen.findByLabelText("8-digit verification code");
    await userEvent.click(screen.getByRole("button", { name: "Change email" }));
    expect(
      screen.getByRole("heading", { name: "Unlock your pattern download" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("8-digit verification code")).toBeNull();
  });

  it("shows cancellation when the original Pattern is replaced", () => {
    const enabled = capability();
    const view = render(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );
    view.rerender(
      <EmailGateDialog
        capability={enabled}
        patternReplaced
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Your pattern changed" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No download was started.")).toHaveAttribute(
      "data-tone",
      "error",
    );
  });

  it("exposes semantic tones for progress and errors", async () => {
    let finishIssue:
      | ((
          value: Awaited<ReturnType<EmailGateBrowserClient["issueChallenge"]>>,
        ) => void)
      | undefined;
    const issueChallenge = vi.fn(
      () =>
        new Promise<
          Awaited<ReturnType<EmailGateBrowserClient["issueChallenge"]>>
        >((resolve) => {
          finishIssue = resolve;
        }),
    );
    render(
      <EmailGateDialog
        capability={capability({ issueChallenge })}
        patternReplaced={false}
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "a@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(screen.getByText("Sending your verification code.")).toHaveAttribute(
      "data-tone",
      "progress",
    );

    finishIssue?.({
      ok: true,
      response: { schemaVersion: 1, result: "service_unavailable" },
    });
    expect(
      await screen.findByText(
        "Verification is temporarily unavailable. Please try again.",
      ),
    ).toHaveAttribute("data-tone", "error");
  });

  it("distinguishes verifying progress from a persistence warning", async () => {
    let finishVerification:
      | ((
          value: Awaited<ReturnType<EmailGateBrowserClient["verifyChallenge"]>>,
        ) => void)
      | undefined;
    const verifyChallenge = vi.fn(
      () =>
        new Promise<
          Awaited<ReturnType<EmailGateBrowserClient["verifyChallenge"]>>
        >((resolve) => {
          finishVerification = resolve;
        }),
    );
    render(
      <EmailGateDialog
        capability={capability({ verifyChallenge })}
        patternReplaced={false}
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({
          outcome: "persistence-warning" as const,
        }))}
      />,
    );

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "a@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    const code = await screen.findByLabelText("8-digit verification code");
    await userEvent.click(code);
    await userEvent.paste("01234567");
    await userEvent.click(
      screen.getByRole("button", { name: "Verify & download" }),
    );
    expect(screen.getByText("Verifying your code.")).toHaveAttribute(
      "data-tone",
      "progress",
    );

    finishVerification?.({
      ok: true,
      response: {
        schemaVersion: 1,
        result: "verification_succeeded",
        verified: true,
      },
    });
    expect(
      await screen.findByText(
        "Your current download has started, but the unlock could not be saved.",
      ),
    ).toHaveAttribute("data-tone", "warning");
  });
});
