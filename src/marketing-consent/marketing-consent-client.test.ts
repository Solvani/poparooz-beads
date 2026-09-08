import { afterEach, describe, expect, it, vi } from "vitest";

import { createMarketingConsentBrowserClient } from "./marketing-consent-client";
import { createProductionMarketingConsentCapability } from "./production-marketing-consent-capability";

const challengeId = "abcdefab-cdef-4abc-8def-abcdefabcdef";
const headers = { "Content-Type": "application/json; charset=utf-8" };
const envelope = (result = "grant_persisted") => ({ schemaVersion: 1, result });
const json = (result = "grant_persisted", status = 200) =>
  new Response(JSON.stringify(envelope(result)), { status, headers });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Marketing Consent browser grant client", () => {
  it("constructs only the frozen grant and locked-down fetch options", async () => {
    const fetchMock = vi.fn(async () => json());
    const client = createMarketingConsentBrowserClient({ fetch: fetchMock });
    await expect(client.grant({ challengeId })).resolves.toEqual({
      ok: true,
      response: envelope(),
    });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "/api/marketing-consent/v1/grants",
      {
        method: "POST",
        credentials: "omit",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          challengeId,
          consentVersion: "marketing-consent-v1.0.0",
          affirmativeIntent: true,
        }),
        signal: expect.any(AbortSignal),
      },
    );
  });

  it.each([
    "email",
    "consentVersion",
    "affirmativeIntent",
    "sourceContext",
    "timestamp",
    "eventId",
    "subscriptionId",
  ])("rejects caller override %s without fetch", async (field) => {
    const fetchMock = vi.fn(async () => json());
    const client = createMarketingConsentBrowserClient({ fetch: fetchMock });
    await expect(
      client.grant({ challengeId, [field]: "forbidden" }),
    ).resolves.toEqual({ ok: false, reason: "invalid-request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed for invalid challengeId", async () => {
    const fetchMock = vi.fn(async () => json());
    await expect(
      createMarketingConsentBrowserClient({ fetch: fetchMock }).grant({
        challengeId: "invalid",
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid-request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [200, "grant_persisted"],
    [200, "already_active"],
    [400, "invalid_request"],
    [400, "version_unsupported"],
    [409, "verification_authority_invalid"],
    [503, "service_unavailable"],
  ] as const)("accepts %i %s", async (status, result) => {
    const client = createMarketingConsentBrowserClient({
      fetch: vi.fn(async () => json(result, status)),
    });
    await expect(client.grant({ challengeId })).resolves.toEqual({
      ok: true,
      response: envelope(result),
    });
  });

  it.each([
    [
      "redirect",
      () => {
        const response = json();
        Object.defineProperty(response, "redirected", { value: true });
        return response;
      },
    ],
    [
      "wrong content type",
      () =>
        new Response(JSON.stringify(envelope()), {
          headers: { "Content-Type": "application/json" },
        }),
    ],
    ["malformed JSON", () => new Response("{", { headers })],
    [
      "unknown field",
      () =>
        new Response(JSON.stringify({ ...envelope(), private: true }), {
          headers,
        }),
    ],
    [
      "wrong schema version",
      () =>
        new Response(
          JSON.stringify({ schemaVersion: 2, result: "grant_persisted" }),
          { headers },
        ),
    ],
    ["invalid pair", () => json("grant_persisted", 503)],
    ["withdrawal result", () => json("withdrawn")],
    ["unexpected status", () => json("invalid_request", 404)],
    [
      "oversized declared body",
      () =>
        new Response("{}", {
          headers: { ...headers, "Content-Length": "4097" },
        }),
    ],
    [
      "oversized stream",
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(" ".repeat(4097)));
              controller.close();
            },
          }),
          { headers },
        ),
    ],
    ["invalid UTF-8", () => new Response(new Uint8Array([0xff]), { headers })],
  ] as const)("rejects %s", async (_name, response) => {
    const client = createMarketingConsentBrowserClient({
      fetch: vi.fn(async () => response()),
    });
    await expect(client.grant({ challengeId })).resolves.toEqual({
      ok: false,
      reason: "invalid-response",
    });
  });

  it("accepts exactly 4096 response bytes", async () => {
    const client = createMarketingConsentBrowserClient({
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify(envelope()).padEnd(4096, " "), {
            headers,
          }),
      ),
    });
    await expect(client.grant({ challengeId })).resolves.toEqual({
      ok: true,
      response: envelope(),
    });
  });

  it("contains network exceptions without exposing details", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("private network detail");
    });
    await expect(
      createMarketingConsentBrowserClient({ fetch: fetchMock }).grant({
        challengeId,
      }),
    ).resolves.toEqual({ ok: false, reason: "network" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(["fetch", "body"] as const)(
    "times out a stalled %s at 5 seconds even if fetch ignores abort",
    async (phase) => {
      vi.useFakeTimers();
      const cancel = vi.fn();
      const response = new Response(new ReadableStream({ cancel }), {
        headers,
      });
      const fetchMock = vi.fn<typeof fetch>(() =>
        phase === "fetch"
          ? new Promise<Response>(() => {})
          : Promise.resolve(response),
      );
      const result = createMarketingConsentBrowserClient({
        fetch: fetchMock,
      }).grant({ challengeId });
      await vi.advanceTimersByTimeAsync(5000);
      await expect(result).resolves.toEqual({ ok: false, reason: "timeout" });
      expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      if (phase === "body") expect(cancel).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("supports pre-abort and abort while pending, removing its listener and timer", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>(
      () => new Promise<Response>(() => {}),
    );
    const client = createMarketingConsentBrowserClient({ fetch: fetchMock });
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const pending = client.grant({ challengeId }, controller.signal);
    controller.abort();
    await expect(pending).resolves.toEqual({ ok: false, reason: "aborted" });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    await expect(
      client.grant({ challengeId }, controller.signal),
    ).resolves.toEqual({ ok: false, reason: "aborted" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("creates a separate production capability without fetching until grant", async () => {
    const fetchMock = vi
      .spyOn(window, "fetch")
      .mockImplementation(async () => json());
    const capability = createProductionMarketingConsentCapability(true);
    expect(capability.availability.available).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(capability.client.grant({ challengeId })).resolves.toEqual({
      ok: true,
      response: envelope(),
    });
  });
});
