import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailGateBrowserClient } from "./email-gate-client";
import { createEmailGateBrowserClient } from "./email-gate-client";
import type {
  EmailGateCapability,
  EmailGateIssueProofProvider,
} from "./email-gate-capability";
import { EmailGateDialog } from "./EmailGateDialog";
import type { EmailGateDialogProps } from "./EmailGateDialog";

const CHALLENGE_ID = "abcdefab-cdef-4abc-8def-abcdefabcdef";

type EnabledCapability = Extract<
  EmailGateCapability,
  { availability: { available: true } }
>;

function capability(
  overrides: Partial<EmailGateBrowserClient> = {},
  interaction?: NonNullable<EmailGateIssueProofProvider["interaction"]>,
): EnabledCapability {
  return {
    availability: { available: true },
    issueProofProvider: {
      getFreshIssueToken: vi.fn(async () => "proof"),
      ...(interaction ? { interaction } : {}),
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

function interactionSignal(initial = false) {
  let active = initial;
  const listeners = new Set<() => void>();
  return {
    interaction: {
      isActive: () => active,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        let subscribed = true;
        return () => {
          if (!subscribed) return;
          subscribed = false;
          listeners.delete(listener);
        };
      },
    },
    setActive: (next: boolean) => {
      if (active === next) return;
      active = next;
      listeners.forEach((listener) => listener());
    },
    subscriberCount: () => listeners.size,
  };
}

function renderDialog(
  enabled: EnabledCapability,
  options: Partial<
    Pick<
      EmailGateDialogProps,
      "onClose" | "onVerified" | "marketingConsentAvailable"
    >
  > = {},
) {
  return render(
    <EmailGateDialog
      capability={enabled}
      patternReplaced={false}
      onClose={options.onClose ?? vi.fn()}
      onVerified={
        options.onVerified ??
        vi.fn(async () => ({ outcome: "downloaded" as const }))
      }
      marketingConsentAvailable={options.marketingConsentAvailable}
    />,
  );
}

function getTurnstileGuard() {
  const guard = document.querySelector<HTMLElement>(
    "[data-email-gate-end-focus-guard]",
  );
  expect(guard).not.toBeNull();
  return guard!;
}

function appendModeledTurnstileBoundary() {
  const modeledBoundary = document.createElement("div");
  modeledBoundary.tabIndex = 0;
  document.getElementById("email-gate-turnstile")?.append(modeledBoundary);
  return modeledBoundary;
}

function tabKeyDown(shiftKey: boolean) {
  return new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
}

function PassivePatternReplacementResolver({
  patternReplaced,
  resolvePendingProof,
}: {
  readonly patternReplaced: boolean;
  readonly resolvePendingProof: () => void;
}) {
  useEffect(() => {
    if (patternReplaced) resolvePendingProof();
  }, [patternReplaced, resolvePendingProof]);
  return null;
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

describe("Email Gate Marketing intent", () => {
  const copy =
    "Optional — Email me occasional Poparooz updates, pattern ideas, and offers. Unsubscribe anytime.";
  async function enterEmail(checked = false) {
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "test@example.invalid",
    );
    if (checked)
      await userEvent.click(screen.getByRole("checkbox", { name: copy }));
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await screen.findByLabelText("8-digit verification code");
  }
  async function verify() {
    await userEvent.type(
      screen.getByLabelText("8-digit verification code"),
      "01234567",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Verify & download" }),
    );
  }

  it("defaults unchecked with exact accessible copy, native keyboard control and truthful footer", async () => {
    renderDialog(capability(), { marketingConsentAvailable: true });
    const checkbox = screen.getByRole("checkbox", { name: copy });
    expect(checkbox).not.toBeChecked();
    screen.getByLabelText("Email address").focus();
    await userEvent.tab();
    expect(checkbox).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(checkbox).toBeChecked();
    expect(
      screen.getByText(
        "Email verification is required for download. Poparooz updates and offers are optional and only enabled if you choose them above.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No account. No password.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send verification code" }),
    ).toBeEnabled();
  });

  it("hides unavailable Marketing and resets intent on any email edit", async () => {
    const view = renderDialog(capability());
    expect(screen.queryByRole("checkbox")).toBeNull();
    view.unmount();
    renderDialog(capability(), { marketingConsentAvailable: true });
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "test@example.invalid",
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByLabelText("Email address"), "x");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it.each([false, true])(
    "keeps actual Email Gate wire bodies unchanged with intent %s",
    async (checked) => {
      const fetchMock = vi.fn<typeof fetch>(
        async (path) =>
          new Response(
            JSON.stringify(
              path === "/api/email-gate/v1/challenges"
                ? {
                    schemaVersion: 1,
                    result: "challenge_issued",
                    challengeId: CHALLENGE_ID,
                    expiresInSeconds: 580,
                    resendAfterSeconds: 45,
                  }
                : {
                    schemaVersion: 1,
                    result: "verification_succeeded",
                    verified: true,
                  },
            ),
            {
              status: path === "/api/email-gate/v1/challenges" ? 201 : 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            },
          ),
      );
      const onVerified = vi.fn<EmailGateDialogProps["onVerified"]>(
        async () => ({
          outcome: "downloaded" as const,
        }),
      );
      renderDialog(
        capability(createEmailGateBrowserClient({ fetch: fetchMock })),
        { marketingConsentAvailable: true, onVerified },
      );
      await enterEmail(checked);
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(onVerified).not.toHaveBeenCalled();
      await verify();
      await screen.findByRole("dialog", { name: "Email verified" });
      expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
        "/api/email-gate/v1/challenges",
        "/api/email-gate/v1/verifications",
      ]);
      expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
        schemaVersion: 1,
        email: "test@example.invalid",
        turnstileToken: "proof",
      });
      expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
        schemaVersion: 1,
        challengeId: CHALLENGE_ID,
        code: "01234567",
      });
      expect(onVerified).toHaveBeenCalledExactlyOnceWith({
        challengeId: CHALLENGE_ID,
        marketingConsent: checked,
      });
      expect(Object.isFrozen(onVerified.mock.calls[0]?.[0])).toBe(true);
      expect(screen.queryByRole("checkbox")).toBeNull();
    },
  );

  it("disables issue-time edits and preserves the submitted snapshot through resend", async () => {
    let resolveIssue!: (
      value: Awaited<ReturnType<EmailGateBrowserClient["issueChallenge"]>>,
    ) => void;
    const issued = new Promise<
      Awaited<ReturnType<EmailGateBrowserClient["issueChallenge"]>>
    >((resolve) => {
      resolveIssue = resolve;
    });
    const nextId = "abcdefab-cdef-4abc-8def-abcdefabcdea";
    const gate = capability({
      issueChallenge: vi
        .fn()
        .mockReturnValueOnce(issued)
        .mockResolvedValue({
          ok: true,
          response: {
            schemaVersion: 1,
            result: "challenge_issued",
            challengeId: nextId,
            expiresInSeconds: 580,
            resendAfterSeconds: 0,
          },
        }),
    });
    const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
    renderDialog(gate, { marketingConsentAvailable: true, onVerified });
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "test@example.invalid",
    );
    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(checkbox).toBeDisabled();
    await userEvent.click(checkbox);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "other@example.invalid" },
    });
    expect(checkbox).toBeChecked();
    await act(async () =>
      resolveIssue({
        ok: true,
        response: {
          schemaVersion: 1,
          result: "challenge_issued",
          challengeId: CHALLENGE_ID,
          expiresInSeconds: 580,
          resendAfterSeconds: 0,
        },
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Resend code" }));
    await waitFor(() =>
      expect(gate.client.issueChallenge).toHaveBeenCalledTimes(2),
    );
    for (const call of vi.mocked(gate.client.issueChallenge).mock.calls)
      expect(call[0]).toEqual({
        email: "test@example.invalid",
        turnstileToken: "proof",
      });
    await verify();
    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledExactlyOnceWith({
        challengeId: nextId,
        marketingConsent: true,
      }),
    );
  });

  it("Change email clears both checkbox and submitted intent", async () => {
    const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
    renderDialog(capability(), { marketingConsentAvailable: true, onVerified });
    await enterEmail(true);
    await userEvent.click(screen.getByRole("button", { name: "Change email" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    await userEvent.clear(screen.getByLabelText("Email address"));
    await enterEmail();
    await verify();
    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledExactlyOnceWith({
        challengeId: CHALLENGE_ID,
        marketingConsent: false,
      }),
    );
  });

  it.each([
    "verification_invalid",
    "verification_expired",
    "verification_locked",
  ] as const)(
    "hides the checkbox for %s and preserves intent on request-new-code",
    async (result) => {
      const gate = capability({
        verifyChallenge: vi.fn(async () => ({
          ok: true as const,
          response: { schemaVersion: 1 as const, result },
        })),
      });
      const onVerified = vi.fn(async () => ({
        outcome: "downloaded" as const,
      }));
      renderDialog(gate, { marketingConsentAvailable: true, onVerified });
      await enterEmail(true);
      await verify();
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(onVerified).not.toHaveBeenCalled();
      vi.mocked(gate.client.verifyChallenge).mockResolvedValue({
        ok: true,
        response: {
          schemaVersion: 1,
          result: "verification_succeeded",
          verified: true,
        },
      });
      if (result !== "verification_invalid")
        await userEvent.click(
          screen.getByRole("button", { name: "Request a new code" }),
        );
      await screen.findByLabelText("8-digit verification code");
      await userEvent.clear(screen.getByLabelText("8-digit verification code"));
      await verify();
      await waitFor(() =>
        expect(onVerified).toHaveBeenCalledExactlyOnceWith({
          challengeId: CHALLENGE_ID,
          marketingConsent: true,
        }),
      );
    },
  );

  it("retries the new email and its intent after changing email and an issue failure", async () => {
    const gate = capability();
    const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
    renderDialog(gate, { marketingConsentAvailable: true, onVerified });
    await enterEmail(true);
    await userEvent.click(screen.getByRole("button", { name: "Change email" }));
    await userEvent.clear(screen.getByLabelText("Email address"));
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "new@example.invalid",
    );
    await userEvent.click(screen.getByRole("checkbox"));
    vi.mocked(gate.client.issueChallenge).mockResolvedValueOnce({
      ok: false,
      reason: "network",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Request a new code" }),
    );
    await screen.findByLabelText("8-digit verification code");
    expect(vi.mocked(gate.client.issueChallenge).mock.calls[2]?.[0]).toEqual({
      email: "new@example.invalid",
      turnstileToken: "proof",
    });
    await verify();
    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledExactlyOnceWith({
        challengeId: CHALLENGE_ID,
        marketingConsent: true,
      }),
    );
  });

  it("hides the checkbox in persistence-warning and pattern-replaced phases", async () => {
    const gate = capability();
    const onVerified = vi.fn(async () => ({
      outcome: "persistence-warning" as const,
    }));
    const view = renderDialog(gate, {
      marketingConsentAvailable: true,
      onVerified,
    });
    await enterEmail(true);
    await verify();
    await screen.findByRole("heading", { name: "Download unlocked for now" });
    expect(screen.queryByRole("checkbox")).toBeNull();
    view.rerender(
      <EmailGateDialog
        capability={gate}
        marketingConsentAvailable
        patternReplaced
        onClose={vi.fn()}
        onVerified={onVerified}
      />,
    );
    await screen.findByRole("heading", { name: "Your pattern changed" });
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
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

  it("preserves a pending issue, focus, and background isolation while using the latest onClose", async () => {
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
    let issueSignal: AbortSignal | undefined;
    const enabled = capability();
    enabled.issueProofProvider.getFreshIssueToken = vi.fn(
      (signal: AbortSignal) => {
        issueSignal = signal;
        return new Promise<string>(() => {});
      },
    );
    const view = render(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={onCloseA}
        onVerified={onVerified}
      />,
    );
    const background = document.querySelector<HTMLElement>(".app-root")!;
    const removeBackgroundAttribute = vi.spyOn(background, "removeAttribute");

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "customer@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(issueSignal?.aborted).toBe(false);
    expect(screen.getByText("Sending your verification code.")).toHaveAttribute(
      "data-tone",
      "progress",
    );

    const close = screen.getByRole("button", { name: "Close" });
    close.focus();
    view.rerender(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={onCloseB}
        onVerified={onVerified}
      />,
    );

    expect(issueSignal?.aborted).toBe(false);
    expect(close).toHaveFocus();
    expect(document.getElementById("opener")).not.toHaveFocus();
    expect(background).toHaveAttribute("inert");
    expect(background).toHaveAttribute("aria-hidden", "true");
    expect(removeBackgroundAttribute).not.toHaveBeenCalledWith("inert");
    expect(removeBackgroundAttribute).not.toHaveBeenCalledWith("aria-hidden");
    expect(screen.getByText("Sending your verification code.")).toHaveAttribute(
      "data-tone",
      "progress",
    );

    await userEvent.click(close);
    expect(onCloseA).not.toHaveBeenCalled();
    expect(onCloseB).toHaveBeenCalledOnce();

    await userEvent.keyboard("{Escape}");
    expect(onCloseA).not.toHaveBeenCalled();
    expect(onCloseB).toHaveBeenCalledTimes(2);

    view.unmount();
    expect(issueSignal?.aborted).toBe(true);
    expect(document.getElementById("opener")).toHaveFocus();
  });

  it("does not abort pending verification when onClose identity changes", async () => {
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
    let verificationSignal: AbortSignal | undefined;
    const verifyChallenge = vi.fn(
      (
        _request: Parameters<EmailGateBrowserClient["verifyChallenge"]>[0],
        signal: AbortSignal,
      ) => {
        verificationSignal = signal;
        return new Promise<
          Awaited<ReturnType<EmailGateBrowserClient["verifyChallenge"]>>
        >(() => {});
      },
    );
    const enabled = capability({ verifyChallenge });
    const view = render(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={onCloseA}
        onVerified={onVerified}
      />,
    );

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "customer@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    const code = await screen.findByLabelText("8-digit verification code");
    await userEvent.type(code, "01234567");
    await userEvent.click(
      screen.getByRole("button", { name: "Verify & download" }),
    );
    expect(verificationSignal?.aborted).toBe(false);

    view.rerender(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={onCloseB}
        onVerified={onVerified}
      />,
    );

    expect(verificationSignal?.aborted).toBe(false);
    expect(screen.getByText("Verifying your code.")).toHaveAttribute(
      "data-tone",
      "progress",
    );
    view.unmount();
    expect(verificationSignal?.aborted).toBe(true);
  });

  it("arms only from a genuine Window blur with active Turnstile-boundary focus and preserves native forward Tab", () => {
    const signal = interactionSignal(true);
    renderDialog(capability({}, signal.interaction));
    const close = screen.getByRole("button", { name: "Close" });
    const guard = getTurnstileGuard();
    const modeledBoundary = appendModeledTurnstileBoundary();

    expect(guard).toHaveAttribute("tabindex", "-1");
    modeledBoundary.focus();
    modeledBoundary.dispatchEvent(new FocusEvent("blur"));
    expect(guard).toHaveAttribute("tabindex", "-1");

    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "0");
    expect(modeledBoundary).toHaveFocus();
    expect(guard).toBeEmptyDOMElement();
    expect(guard).not.toHaveAttribute("aria-hidden");
    expect(guard).not.toHaveAttribute("role");

    close.focus();
    const forwardTab = tabKeyDown(false);
    close.dispatchEvent(forwardTab);
    expect(forwardTab.defaultPrevented).toBe(false);
  });

  it("rejects Window blur when interaction is inactive or focus is outside the Turnstile mount", () => {
    const signal = interactionSignal();
    renderDialog(capability({}, signal.interaction));
    const close = screen.getByRole("button", { name: "Close" });
    const guard = getTurnstileGuard();
    const modeledBoundary = appendModeledTurnstileBoundary();

    modeledBoundary.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "-1");

    act(() => signal.setActive(true));
    close.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "-1");

    document.body.tabIndex = -1;
    document.body.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "-1");
  });

  it("synchronizes the interaction ref after commit without reinstalling the Window listener", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const signal = interactionSignal();
    renderDialog(capability({}, signal.interaction));
    const guard = getTurnstileGuard();
    const modeledBoundary = appendModeledTurnstileBoundary();
    const blurRegistrationCount = () =>
      addEventListener.mock.calls.filter(
        ([type, , capture]) => type === "blur" && capture === true,
      ).length;

    expect(guard).toHaveAttribute("tabindex", "-1");
    expect(blurRegistrationCount()).toBe(1);

    act(() => signal.setActive(true));
    modeledBoundary.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "0");
    expect(blurRegistrationCount()).toBe(1);

    act(() => signal.setActive(false));
    expect(guard).toHaveAttribute("tabindex", "-1");
    expect(blurRegistrationCount()).toBe(1);
  });

  it("redirects the forward end guard and safely contains the reverse boundary without opaque reentry", () => {
    const signal = interactionSignal(true);
    renderDialog(capability({}, signal.interaction));
    const close = screen.getByRole("button", { name: "Close" });
    const guard = getTurnstileGuard();
    const modeledBoundary = appendModeledTurnstileBoundary();

    modeledBoundary.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "0");
    act(() => guard.focus());
    expect(close).toHaveFocus();
    expect(document.body).not.toHaveFocus();
    expect(guard).toHaveAttribute("tabindex", "-1");

    const focusModeledBoundary = vi.spyOn(modeledBoundary, "focus");
    const reverseTab = tabKeyDown(true);
    close.dispatchEvent(reverseTab);
    expect(reverseTab.defaultPrevented).toBe(true);
    expect(focusModeledBoundary).not.toHaveBeenCalled();
    expect(close).toHaveFocus();
    expect(document.body).not.toHaveFocus();

    const forwardTab = tabKeyDown(false);
    close.dispatchEvent(forwardTab);
    expect(forwardTab.defaultPrevented).toBe(false);
  });

  it("contains reverse focus on the legitimate first dialog target and leaves subsequent forward Tab native", () => {
    const signal = interactionSignal(true);
    renderDialog(capability({}, signal.interaction));
    const close = screen.getByRole("button", { name: "Close" });
    close.focus();

    const reverseTab = tabKeyDown(true);
    close.dispatchEvent(reverseTab);
    expect(reverseTab.defaultPrevented).toBe(true);
    expect(close).toHaveFocus();
    expect(document.body).not.toHaveFocus();

    const forwardTab = tabKeyDown(false);
    close.dispatchEvent(forwardTab);
    expect(forwardTab.defaultPrevented).toBe(false);
  });

  it("preserves ordinary reverse traversal away from the boundary during active interaction", async () => {
    const signal = interactionSignal(true);
    renderDialog(capability({}, signal.interaction));
    const close = screen.getByRole("button", { name: "Close" });
    const email = screen.getByLabelText("Email address");

    // The provider-neutral fake intentionally holds interaction active in this
    // existing multi-control state to isolate the active + non-first predicate.
    close.focus();
    await userEvent.tab();
    expect(signal.interaction.isActive()).toBe(true);
    expect(email).not.toBe(close);
    expect(email).toHaveFocus();

    let shiftTabDefaultPrevented: boolean | undefined;
    const observeShiftTab = (event: KeyboardEvent) => {
      if (event.key === "Tab" && event.shiftKey) {
        shiftTabDefaultPrevented = event.defaultPrevented;
      }
    };
    document.addEventListener("keydown", observeShiftTab);
    try {
      await userEvent.tab({ shift: true });
    } finally {
      document.removeEventListener("keydown", observeShiftTab);
    }

    expect(shiftTabDefaultPrevented).toBe(false);
    expect(close).toHaveFocus();
  });

  it("reactively clears the armed guard when interaction ends without blur", () => {
    const signal = interactionSignal(true);
    renderDialog(capability({}, signal.interaction));
    const close = screen.getByRole("button", { name: "Close" });
    const guard = getTurnstileGuard();
    const modeledBoundary = appendModeledTurnstileBoundary();
    modeledBoundary.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "0");

    act(() => signal.setActive(false));
    expect(guard).toHaveAttribute("tabindex", "-1");

    act(() => signal.setActive(true));
    close.focus();
    const reverseTab = tabKeyDown(true);
    close.dispatchEvent(reverseTab);
    expect(reverseTab.defaultPrevented).toBe(true);
    expect(close).toHaveFocus();

    modeledBoundary.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "0");
  });

  it("disarms the forward guard when a new proof issuance begins", async () => {
    const signal = interactionSignal(true);
    const enabled = capability({}, signal.interaction);
    enabled.issueProofProvider.getFreshIssueToken = vi.fn(
      () => new Promise<string>(() => {}),
    );
    renderDialog(enabled);
    const email = screen.getByLabelText("Email address");
    await userEvent.type(email, "customer@example.com");
    const guard = getTurnstileGuard();
    const modeledBoundary = appendModeledTurnstileBoundary();
    modeledBoundary.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "0");

    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(guard).toHaveAttribute("tabindex", "-1");
  });

  it("installs one Window blur listener for the mounted dialog lifecycle and removes it on unmount", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const signal = interactionSignal();
    const enabled = capability({}, signal.interaction);
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const onCloseC = vi.fn();
    const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
    const view = render(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={onCloseA}
        onVerified={onVerified}
      />,
    );
    const blurRegistrations = () =>
      addEventListener.mock.calls.filter(
        ([type, , capture]) => type === "blur" && capture === true,
      );
    const blurRemovals = () =>
      removeEventListener.mock.calls.filter(
        ([type, , capture]) => type === "blur" && capture === true,
      );
    expect(blurRegistrations()).toHaveLength(1);
    expect(blurRemovals()).toHaveLength(0);
    const blurListener = blurRegistrations()[0]?.[1];

    act(() => signal.setActive(true));
    act(() => signal.setActive(false));
    expect(blurRegistrations()).toHaveLength(1);
    expect(blurRemovals()).toHaveLength(0);
    expect(signal.subscriberCount()).toBe(1);

    view.rerender(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={onCloseB}
        onVerified={onVerified}
      />,
    );
    view.rerender(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={onCloseC}
        onVerified={onVerified}
      />,
    );
    expect(blurRegistrations()).toHaveLength(1);
    expect(blurRemovals()).toHaveLength(0);

    view.unmount();
    expect(blurRemovals()).toEqual([["blur", blurListener, true]]);
    expect(signal.subscriberCount()).toBe(0);
    expect(() => signal.setActive(true)).not.toThrow();
    expect(signal.subscriberCount()).toBe(0);
    expect(() => window.dispatchEvent(new FocusEvent("blur"))).not.toThrow();

    const reopened = renderDialog(capability({}, signal.interaction));
    expect(blurRegistrations()).toHaveLength(2);
    expect(blurRemovals()).toHaveLength(1);
    expect(getTurnstileGuard()).toHaveAttribute("tabindex", "-1");
    expect(signal.subscriberCount()).toBe(1);
    reopened.unmount();
    expect(blurRemovals()).toHaveLength(2);
    expect(signal.subscriberCount()).toBe(0);
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

  it("remains locked and never calls the API or download completion when proof acquisition fails", async () => {
    const enabled = capability();
    vi.mocked(
      enabled.issueProofProvider.getFreshIssueToken,
    ).mockRejectedValueOnce(new Error("proof failed"));
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
      "customer@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    expect(
      await screen.findByText(
        "Verification is temporarily unavailable. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(enabled.client.issueChallenge).not.toHaveBeenCalled();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("requests a fresh proof for resend instead of reusing the issued token", async () => {
    const enabled = capability({
      issueChallenge: vi.fn(async () => ({
        ok: true as const,
        response: {
          schemaVersion: 1 as const,
          result: "challenge_issued" as const,
          challengeId: CHALLENGE_ID,
          expiresInSeconds: 580,
          resendAfterSeconds: 0,
        },
      })),
    });
    vi.mocked(enabled.issueProofProvider.getFreshIssueToken)
      .mockResolvedValueOnce("proof-one")
      .mockResolvedValueOnce("proof-two");
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
      "customer@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Resend code" }),
    );

    expect(enabled.issueProofProvider.getFreshIssueToken).toHaveBeenCalledTimes(
      2,
    );
    expect(enabled.client.issueChallenge).toHaveBeenNthCalledWith(
      1,
      { email: "customer@example.com", turnstileToken: "proof-one" },
      expect.any(AbortSignal),
    );
    expect(enabled.client.issueChallenge).toHaveBeenNthCalledWith(
      2,
      { email: "customer@example.com", turnstileToken: "proof-two" },
      expect.any(AbortSignal),
    );
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

  it("invalidates an armed guard and stale issue operation when the original Pattern is replaced", async () => {
    const signal = interactionSignal();
    const enabled = capability({}, signal.interaction);
    let issueSignal: AbortSignal | undefined;
    let finishProof: ((token: string) => void) | undefined;
    enabled.issueProofProvider.getFreshIssueToken = vi.fn(
      (operationSignal: AbortSignal) => {
        issueSignal = operationSignal;
        operationSignal.addEventListener(
          "abort",
          () => signal.setActive(false),
          { once: true },
        );
        return new Promise<string>((resolve) => {
          finishProof = resolve;
        });
      },
    );
    const view = render(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "customer@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    const guard = getTurnstileGuard();
    const modeledBoundary = appendModeledTurnstileBoundary();
    act(() => signal.setActive(true));
    modeledBoundary.focus();
    act(() => window.dispatchEvent(new FocusEvent("blur")));
    expect(guard).toHaveAttribute("tabindex", "0");

    view.rerender(
      <EmailGateDialog
        capability={enabled}
        patternReplaced
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );
    expect(issueSignal?.aborted).toBe(true);
    expect(guard).toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("heading", { name: "Your pattern changed" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No download was started.")).toHaveAttribute(
      "data-tone",
      "error",
    );

    view.rerender(
      <EmailGateDialog
        capability={enabled}
        patternReplaced={false}
        onClose={vi.fn()}
        onVerified={vi.fn(async () => ({ outcome: "downloaded" as const }))}
      />,
    );
    act(() => signal.setActive(true));
    expect(guard).toHaveAttribute("tabindex", "-1");
    act(() => signal.setActive(false));

    await act(async () => {
      finishProof?.("stale-proof");
      await Promise.resolve();
    });
    expect(enabled.client.issueChallenge).not.toHaveBeenCalled();
  });

  it("aborts the old issue operation before a same-commit passive resolver releases its stale proof", async () => {
    const enabled = capability();
    let issueSignal: AbortSignal | undefined;
    let finishProof: ((token: string) => void) | undefined;
    let abortedBeforePassiveResolution: boolean | undefined;
    enabled.issueProofProvider.getFreshIssueToken = vi.fn(
      (operationSignal: AbortSignal) => {
        issueSignal = operationSignal;
        return new Promise<string>((resolve) => {
          finishProof = resolve;
        });
      },
    );
    const resolvePendingProof = vi.fn(() => {
      abortedBeforePassiveResolution = issueSignal?.aborted;
      finishProof?.("stale-proof");
    });
    const onVerified = vi.fn(async () => ({ outcome: "downloaded" as const }));
    const view = render(
      <>
        <PassivePatternReplacementResolver
          patternReplaced={false}
          resolvePendingProof={resolvePendingProof}
        />
        <EmailGateDialog
          capability={enabled}
          patternReplaced={false}
          onClose={vi.fn()}
          onVerified={onVerified}
        />
      </>,
    );

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "customer@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(issueSignal?.aborted).toBe(false);

    view.rerender(
      <>
        <PassivePatternReplacementResolver
          patternReplaced
          resolvePendingProof={resolvePendingProof}
        />
        <EmailGateDialog
          capability={enabled}
          patternReplaced
          onClose={vi.fn()}
          onVerified={onVerified}
        />
      </>,
    );

    expect(resolvePendingProof).toHaveBeenCalledOnce();
    expect(abortedBeforePassiveResolution).toBe(true);
    expect(issueSignal?.aborted).toBe(true);
    await act(async () => {
      await Promise.resolve();
    });
    expect(enabled.client.issueChallenge).not.toHaveBeenCalled();
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
