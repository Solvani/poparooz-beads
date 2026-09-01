import { afterEach, describe, expect, it, vi } from "vitest";

import { EMAIL_GATE_UNLOCK_STORAGE_KEY } from "./local-unlock";
import { createProductionEmailGateCapability } from "./production-email-gate-capability";

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("production Email Gate capability", () => {
  it("composes the real browser client, Turnstile provider, and browser unlock store", async () => {
    const fetchMock = vi.fn(async () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            schemaVersion: 1,
            result: "service_unavailable",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const capability = createProductionEmailGateCapability();
    expect(capability.availability).toEqual({ available: true });
    expect(capability.unlockStore.isUnlocked()).toBe(false);
    expect(capability.unlockStore.writeUnlocked()).toBe(true);
    expect(window.localStorage.getItem(EMAIL_GATE_UNLOCK_STORAGE_KEY)).toBe(
      '{"contractVersion":1,"unlocked":true}',
    );

    const result = await capability.client.issueChallenge({
      email: "customer@example.com",
      turnstileToken: "opaque-proof",
    });
    expect(result).toEqual({
      ok: true,
      response: { schemaVersion: 1, result: "service_unavailable" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/email-gate/v1/challenges",
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
        redirect: "error",
      }),
    );
    expect(capability.issueProofProvider.getFreshIssueToken).toEqual(
      expect.any(Function),
    );
    expect(capability.issueProofProvider.interaction?.isActive()).toBe(false);
  });
});
