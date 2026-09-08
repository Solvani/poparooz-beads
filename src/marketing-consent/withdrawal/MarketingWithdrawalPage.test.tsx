import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  EmailGateBrowserClient,
  EmailGateClientResult,
} from "../../email-gate/email-gate-client";
import type { EmailGateIssueProofProvider } from "../../email-gate/email-gate-capability";
import { MarketingWithdrawalPage } from "./MarketingWithdrawalPage";
import { resolveMarketingWithdrawalAvailability } from "./marketing-withdrawal-availability";
import type {
  MarketingWithdrawalBrowserClient,
  MarketingWithdrawalClientResult,
} from "./marketing-withdrawal-client";
import type { MarketingWithdrawalRouteCapability } from "./production-marketing-withdrawal-verification-capability";

const CHALLENGE_A = "11111111-1111-4111-8111-111111111111";
const CHALLENGE_B = "22222222-2222-4222-8222-222222222222";
const enabledAvailability = resolveMarketingWithdrawalAvailability("true");
type AvailableRouteCapability = Extract<
  MarketingWithdrawalRouteCapability,
  { available: true }
>;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function issued(challengeId = CHALLENGE_A, resendAfterSeconds = 0) {
  return {
    ok: true as const,
    response: {
      schemaVersion: 1 as const,
      result: "challenge_issued" as const,
      challengeId,
      expiresInSeconds: 600,
      resendAfterSeconds,
    },
  };
}

function gate(
  options: Readonly<{
    issueChallenge?: EmailGateBrowserClient["issueChallenge"];
    verifyChallenge?: EmailGateBrowserClient["verifyChallenge"];
    getFreshIssueToken?: EmailGateIssueProofProvider["getFreshIssueToken"];
    withdraw?: MarketingWithdrawalBrowserClient["withdraw"];
  }> = {},
): AvailableRouteCapability {
  const defaultVerify = vi.fn<EmailGateBrowserClient["verifyChallenge"]>(
    async (): Promise<EmailGateClientResult> => ({
      ok: true,
      response: {
        schemaVersion: 1,
        result: "verification_succeeded",
        verified: true,
      },
    }),
  );
  const defaultWithdraw = vi.fn<MarketingWithdrawalBrowserClient["withdraw"]>(
    async (): Promise<MarketingWithdrawalClientResult> => ({
      ok: true,
      response: { schemaVersion: 1, result: "withdrawn" },
    }),
  );
  return {
    available: true,
    verification: {
      client: {
        issueChallenge: options.issueChallenge ?? vi.fn(async () => issued()),
        verifyChallenge: options.verifyChallenge ?? defaultVerify,
      },
      issueProofProvider: {
        getFreshIssueToken:
          options.getFreshIssueToken ?? vi.fn(async () => "fresh-proof"),
      },
    },
    withdrawal: {
      availability: { available: true },
      client: {
        withdraw: options.withdraw ?? defaultWithdraw,
      },
    },
  };
}

async function reachCodeEntry(capability: AvailableRouteCapability) {
  const user = userEvent.setup();
  render(
    <MarketingWithdrawalPage
      availability={enabledAvailability}
      capability={capability}
    />,
  );
  await user.type(
    screen.getByLabelText("Email address"),
    " Person@EXAMPLE.COM ",
  );
  await user.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  await screen.findByRole("heading", { name: "Enter your 8-digit code." });
  return user;
}

describe("MarketingWithdrawalPage", () => {
  it("preserves the unavailable shell with no controls or network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <MarketingWithdrawalPage
        availability={resolveMarketingWithdrawalAvailability("false")}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Marketing preferences are temporarily unavailable.",
      }),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid email locally and does not obtain proof", async () => {
    const capability = gate();
    const user = userEvent.setup();
    render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
      />,
    );
    await user.type(screen.getByLabelText("Email address"), "invalid");
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent("valid email");
    expect(
      capability.verification.issueProofProvider.getFreshIssueToken,
    ).not.toHaveBeenCalled();
    expect(capability.withdrawal.client.withdraw).not.toHaveBeenCalled();
  });

  it("uses exact Marketing-specific entry copy", () => {
    render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={gate()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Unsubscribe from Poparooz marketing emails.",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Verify your email to unsubscribe securely."),
    ).toBeVisible();
    expect(document.body).not.toHaveTextContent(
      "Unsubscribe from Poparooz emails.",
    );
  });

  it("normalizes email, obtains fresh proof, and issues before any withdrawal", async () => {
    const capability = gate();
    await reachCodeEntry(capability);

    expect(
      capability.verification.issueProofProvider.getFreshIssueToken,
    ).toHaveBeenCalledOnce();
    expect(capability.verification.client.issueChallenge).toHaveBeenCalledWith(
      { email: "Person@example.com", turnstileToken: "fresh-proof" },
      expect.any(AbortSignal),
    );
    expect(capability.withdrawal.client.withdraw).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid_request", /valid email/i],
    ["retry_later", /too many requests/i],
    ["version_unsupported", /temporarily unavailable/i],
    ["service_unavailable", /temporarily unavailable/i],
  ] as const)("contains the %s issue result", async (result, message) => {
    const capability = gate({
      issueChallenge: vi.fn<EmailGateBrowserClient["issueChallenge"]>(
        async () => ({
          ok: true,
          response: { schemaVersion: 1, result },
        }),
      ),
    });
    const user = userEvent.setup();
    render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
      />,
    );
    await user.type(screen.getByLabelText("Email address"), "a@example.com");
    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    expect(await screen.findByText(message)).toBeVisible();
    expect(capability.withdrawal.client.withdraw).not.toHaveBeenCalled();
  });

  it("requires exactly eight numeric digits before verification", async () => {
    const capability = gate();
    const user = await reachCodeEntry(capability);
    await user.type(screen.getByLabelText("Verification code"), "12ab345");
    fireEvent.submit(
      screen.getByLabelText("Verification code").closest("form")!,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("8-digit");
    expect(
      capability.verification.client.verifyChallenge,
    ).not.toHaveBeenCalled();
  });

  it.each(["withdrawn", "already_withdrawn", "not_active"] as const)(
    "maps %s to the same privacy-safe terminal screen",
    async (result) => {
      const capability = gate({
        withdraw: vi.fn<MarketingWithdrawalBrowserClient["withdraw"]>(
          async () => ({
            ok: true,
            response: { schemaVersion: 1, result },
          }),
        ),
      });
      const user = await reachCodeEntry(capability);
      await user.type(screen.getByLabelText("Verification code"), "01234567");
      await user.click(screen.getByRole("button", { name: "Verify email" }));

      await screen.findByRole("heading", {
        name: "Your marketing preferences are updated.",
      });
      expect(
        screen.getByText(
          "You won't receive Poparooz marketing emails at this email address.",
        ),
      ).toBeVisible();
      expect(document.body).not.toHaveTextContent(
        "You won't receive Poparooz emails",
      );
      expect(
        capability.verification.client.verifyChallenge,
      ).toHaveBeenCalledWith(
        { challengeId: CHALLENGE_A, code: "01234567" },
        expect.any(AbortSignal),
      );
      expect(capability.withdrawal.client.withdraw).toHaveBeenCalledWith(
        { challengeId: CHALLENGE_A },
        expect.any(AbortSignal),
      );
      expect(document.body).not.toHaveTextContent(result);
    },
  );

  it.each([
    ["verification_invalid", "Enter the valid 8-digit verification code."],
    ["retry_later", "Too many attempts."],
    ["service_unavailable", "Verification is temporarily unavailable."],
  ] as const)(
    "contains the %s verification result",
    async (result, message) => {
      const capability = gate({
        verifyChallenge: vi.fn<EmailGateBrowserClient["verifyChallenge"]>(
          async () => ({
            ok: true,
            response: { schemaVersion: 1, result },
          }),
        ),
      });
      const user = await reachCodeEntry(capability);
      await user.type(screen.getByLabelText("Verification code"), "01234567");
      await user.click(screen.getByRole("button", { name: "Verify email" }));

      expect(await screen.findByText(new RegExp(message))).toBeVisible();
      expect(capability.withdrawal.client.withdraw).not.toHaveBeenCalled();
    },
  );

  it.each(["verification_expired", "verification_locked"] as const)(
    "%s discards the old challenge and requests a fresh one only on user action",
    async (result) => {
      const issueChallenge = vi
        .fn<EmailGateBrowserClient["issueChallenge"]>()
        .mockResolvedValueOnce(issued(CHALLENGE_A))
        .mockResolvedValueOnce(issued(CHALLENGE_B));
      const capability = gate({
        issueChallenge,
        verifyChallenge: vi.fn<EmailGateBrowserClient["verifyChallenge"]>(
          async () => ({
            ok: true,
            response: { schemaVersion: 1, result },
          }),
        ),
      });
      const user = await reachCodeEntry(capability);
      await user.type(screen.getByLabelText("Verification code"), "01234567");
      await user.click(screen.getByRole("button", { name: "Verify email" }));
      await screen.findByRole("button", { name: "Request new code" });
      expect(issueChallenge).toHaveBeenCalledOnce();

      await user.click(
        screen.getByRole("button", { name: "Request new code" }),
      );
      await screen.findByRole("heading", { name: "Enter your 8-digit code." });
      expect(issueChallenge).toHaveBeenCalledTimes(2);
      expect(
        capability.verification.issueProofProvider.getFreshIssueToken,
      ).toHaveBeenCalledTimes(2);
    },
  );

  it("resend waits for cooldown, gets new proof, replaces challenge, and resets OTP", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let time = 1_000;
    const issueChallenge = vi
      .fn<EmailGateBrowserClient["issueChallenge"]>()
      .mockResolvedValueOnce(issued(CHALLENGE_A, 5))
      .mockResolvedValueOnce(issued(CHALLENGE_B, 5));
    const capability = gate({ issueChallenge });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
        now={() => time}
      />,
    );
    await user.type(screen.getByLabelText("Email address"), "a@example.com");
    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(
      await screen.findByRole("button", { name: "Resend in 5s" }),
    ).toBeDisabled();
    await user.type(screen.getByLabelText("Verification code"), "1234");

    time = 6_000;
    await act(async () => vi.advanceTimersByTime(500));
    await user.click(screen.getByRole("button", { name: "Resend code" }));
    await waitFor(() => expect(issueChallenge).toHaveBeenCalledTimes(2));
    expect(
      capability.verification.issueProofProvider.getFreshIssueToken,
    ).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Verification code")).toHaveValue("");
  });

  it("a withdrawal 409 discards authority and requires a new challenge", async () => {
    const capability = gate({
      withdraw: vi.fn<MarketingWithdrawalBrowserClient["withdraw"]>(
        async () => ({
          ok: true,
          response: {
            schemaVersion: 1,
            result: "verification_authority_invalid",
          },
        }),
      ),
    });
    const user = await reachCodeEntry(capability);
    await user.type(screen.getByLabelText("Verification code"), "01234567");
    await user.click(screen.getByRole("button", { name: "Verify email" }));

    expect(await screen.findByLabelText("Email address")).toHaveValue(
      "Person@EXAMPLE.COM",
    );
    expect(
      capability.verification.client.issueChallenge,
    ).toHaveBeenCalledOnce();
  });

  it("manually retries an ambiguous withdrawal with the same challenge and fixed deadline", async () => {
    let time = 10_000;
    const withdraw = vi
      .fn<MarketingWithdrawalBrowserClient["withdraw"]>()
      .mockResolvedValueOnce({ ok: false, reason: "network" })
      .mockResolvedValueOnce({
        ok: true,
        response: { schemaVersion: 1, result: "withdrawn" },
      });
    const capability = gate({ withdraw });
    const user = userEvent.setup();
    render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
        now={() => time}
      />,
    );
    await user.type(screen.getByLabelText("Email address"), "a@example.com");
    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await user.type(
      await screen.findByLabelText("Verification code"),
      "01234567",
    );
    await user.click(screen.getByRole("button", { name: "Verify email" }));
    await screen.findByRole("button", { name: "Try update again" });

    time = 610_000;
    await user.click(screen.getByRole("button", { name: "Try update again" }));
    await screen.findByRole("heading", {
      name: "Your marketing preferences are updated.",
    });
    expect(withdraw).toHaveBeenCalledTimes(2);
    expect(withdraw.mock.calls.map((call) => call[0])).toEqual([
      { challengeId: CHALLENGE_A },
      { challengeId: CHALLENGE_A },
    ]);
    expect(
      capability.verification.client.verifyChallenge,
    ).toHaveBeenCalledOnce();
  });

  it("requires fresh verification after the conservative retry deadline", async () => {
    let time = 10_000;
    const capability = gate({
      withdraw: vi.fn<MarketingWithdrawalBrowserClient["withdraw"]>(
        async () => ({ ok: false, reason: "timeout" }),
      ),
    });
    const user = userEvent.setup();
    render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
        now={() => time}
      />,
    );
    await user.type(screen.getByLabelText("Email address"), "a@example.com");
    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await user.type(
      await screen.findByLabelText("Verification code"),
      "01234567",
    );
    await user.click(screen.getByRole("button", { name: "Verify email" }));
    await screen.findByRole("button", { name: "Try update again" });
    time = 610_001;
    await user.click(screen.getByRole("button", { name: "Try update again" }));

    expect(await screen.findByLabelText("Email address")).toBeVisible();
    expect(capability.withdrawal.client.withdraw).toHaveBeenCalledOnce();
  });

  it("Change email aborts verification and suppresses its stale success", async () => {
    let resolveVerify!: (
      value: Awaited<ReturnType<EmailGateBrowserClient["verifyChallenge"]>>,
    ) => void;
    let verifySignal: AbortSignal | undefined;
    const verifyChallenge = vi.fn<EmailGateBrowserClient["verifyChallenge"]>(
      (_input, signal) => {
        verifySignal = signal;
        return new Promise((resolve) => {
          resolveVerify = resolve;
        });
      },
    );
    const capability = gate({ verifyChallenge });
    const user = await reachCodeEntry(capability);
    await user.type(screen.getByLabelText("Verification code"), "01234567");
    fireEvent.submit(
      screen.getByLabelText("Verification code").closest("form")!,
    );
    await waitFor(() => expect(verifyChallenge).toHaveBeenCalledOnce());
    await user.click(screen.getByRole("button", { name: "Change email" }));
    expect(verifySignal?.aborted).toBe(true);

    await act(async () =>
      resolveVerify({
        ok: true,
        response: {
          schemaVersion: 1,
          result: "verification_succeeded",
          verified: true,
        },
      }),
    );
    expect(screen.getByLabelText("Email address")).toBeVisible();
    expect(capability.withdrawal.client.withdraw).not.toHaveBeenCalled();
  });

  it("resend supersedes verification so the old result cannot withdraw", async () => {
    let resolveVerify!: (
      value: Awaited<ReturnType<EmailGateBrowserClient["verifyChallenge"]>>,
    ) => void;
    let verifySignal: AbortSignal | undefined;
    const issueChallenge = vi
      .fn<EmailGateBrowserClient["issueChallenge"]>()
      .mockResolvedValueOnce(issued(CHALLENGE_A))
      .mockResolvedValueOnce(issued(CHALLENGE_B));
    const capability = gate({
      issueChallenge,
      verifyChallenge: vi.fn<EmailGateBrowserClient["verifyChallenge"]>(
        (_input, signal) => {
          verifySignal = signal;
          return new Promise((resolve) => {
            resolveVerify = resolve;
          });
        },
      ),
    });
    const user = await reachCodeEntry(capability);
    await user.type(screen.getByLabelText("Verification code"), "01234567");
    fireEvent.submit(
      screen.getByLabelText("Verification code").closest("form")!,
    );
    await waitFor(() =>
      expect(
        capability.verification.client.verifyChallenge,
      ).toHaveBeenCalledOnce(),
    );
    await user.click(screen.getByRole("button", { name: "Resend code" }));
    await waitFor(() => expect(issueChallenge).toHaveBeenCalledTimes(2));
    expect(verifySignal?.aborted).toBe(true);

    await act(async () =>
      resolveVerify({
        ok: true,
        response: {
          schemaVersion: 1,
          result: "verification_succeeded",
          verified: true,
        },
      }),
    );
    expect(capability.withdrawal.client.withdraw).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        `We sent a fresh verification code to Person@example.com.`,
      ),
    ).toBeVisible();
  });

  it("does not persist challenge authority and starts fresh after remount", async () => {
    const localSet = vi.spyOn(Storage.prototype, "setItem");
    const capability = gate();
    const view = render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
      />,
    );
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "a@example.com" },
    });
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await screen.findByLabelText("Verification code");
    view.unmount();
    render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
      />,
    );

    expect(screen.getByLabelText("Email address")).toHaveValue("");
    expect(localSet).not.toHaveBeenCalled();
  });

  it("unmount aborts the current issue operation", async () => {
    let issueSignal: AbortSignal | undefined;
    const capability = gate({
      getFreshIssueToken: vi.fn<
        EmailGateIssueProofProvider["getFreshIssueToken"]
      >((signal) => {
        issueSignal = signal;
        return new Promise<string>(() => {});
      }),
    });
    const user = userEvent.setup();
    const view = render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
      />,
    );
    await user.type(screen.getByLabelText("Email address"), "a@example.com");
    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(issueSignal?.aborted).toBe(false);
    view.unmount();
    expect(issueSignal?.aborted).toBe(true);
  });

  it("guards a double email submission from duplicate issue operations", async () => {
    const capability = gate({
      getFreshIssueToken: vi.fn<
        EmailGateIssueProofProvider["getFreshIssueToken"]
      >(() => new Promise<string>(() => {})),
    });
    render(
      <MarketingWithdrawalPage
        availability={enabledAvailability}
        capability={capability}
      />,
    );
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "a@example.com" },
    });
    const form = screen.getByLabelText("Email address").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(
      capability.verification.issueProofProvider.getFreshIssueToken,
    ).toHaveBeenCalledOnce();
  });
});
