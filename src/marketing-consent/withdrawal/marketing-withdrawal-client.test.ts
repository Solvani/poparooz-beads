import { afterEach, describe, expect, it, vi } from "vitest";

import { createMarketingWithdrawalBrowserClient } from "./marketing-withdrawal-client";

const challengeId = "123e4567-e89b-42d3-a456-426614174000";
const headers = { "Content-Type": "application/json; charset=utf-8" };

function envelope(
  result:
    | "withdrawn"
    | "already_withdrawn"
    | "not_active"
    | "invalid_request"
    | "version_unsupported"
    | "verification_authority_invalid"
    | "service_unavailable" = "withdrawn",
) {
  return { schemaVersion: 1 as const, result };
}

function json(
  result: Parameters<typeof envelope>[0] = "withdrawn",
  status = 200,
) {
  return new Response(JSON.stringify(envelope(result)), { status, headers });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Marketing withdrawal browser client", () => {
  it("sends the exact strict withdrawal request and security options", async () => {
    const fetchMock = vi.fn(async () => json());
    const client = createMarketingWithdrawalBrowserClient({ fetch: fetchMock });

    await expect(client.withdraw({ challengeId })).resolves.toEqual({
      ok: true,
      response: envelope(),
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/marketing-consent/v1/withdrawals",
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaVersion: 1, challengeId }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([
    ["invalid challenge", { challengeId: "not-a-uuid" }],
    ["extra field", { challengeId, affirmativeIntent: true }],
    ["email override", { challengeId, email: "private@example.com" }],
    ["schema version override", { challengeId, schemaVersion: 2 }],
  ])("rejects %s before fetch", async (_label, input) => {
    const fetchMock = vi.fn(async () => json());
    const client = createMarketingWithdrawalBrowserClient({ fetch: fetchMock });

    await expect(
      client.withdraw(input as { challengeId: string }),
    ).resolves.toEqual({ ok: false, reason: "invalid-request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [200, "withdrawn"],
    [200, "already_withdrawn"],
    [200, "not_active"],
    [400, "invalid_request"],
    [400, "version_unsupported"],
    [409, "verification_authority_invalid"],
  ] as const)("accepts %i %s without retry", async (status, result) => {
    const fetchMock = vi.fn(async () => json(result, status));
    const response = await createMarketingWithdrawalBrowserClient({
      fetch: fetchMock,
    }).withdraw({ challengeId });

    expect(response).toEqual({ ok: true, response: envelope(result) });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "grant result",
      json("withdrawn"),
      { schemaVersion: 1, result: "grant_persisted" },
    ],
    [
      "already-active result",
      json("withdrawn"),
      { schemaVersion: 1, result: "already_active" },
    ],
    ["unknown field", json(), { ...envelope(), internal: "detail" }],
    ["wrong schema version", json(), { schemaVersion: 2, result: "withdrawn" }],
  ])("rejects a strict-envelope violation: %s", async (_label, base, body) => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(body), { status: base.status, headers }),
    );
    await expect(
      createMarketingWithdrawalBrowserClient({ fetch: fetchMock }).withdraw({
        challengeId,
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    [200, "invalid_request"],
    [400, "withdrawn"],
    [409, "not_active"],
    [418, "withdrawn"],
  ] as const)(
    "rejects invalid pair %i %s without retry",
    async (status, result) => {
      const fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify({ schemaVersion: 1, result }), {
            status,
            headers,
          }),
      );
      await expect(
        createMarketingWithdrawalBrowserClient({ fetch: fetchMock }).withdraw({
          challengeId,
        }),
      ).resolves.toEqual({ ok: false, reason: "invalid-response" });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["malformed JSON", new Response("{", { headers })],
    ["empty body", new Response("", { headers })],
    [
      "wrong content type",
      new Response(JSON.stringify(envelope()), {
        headers: { "Content-Type": "application/json" },
      }),
    ],
  ])("rejects %s without retry", async (_label, response) => {
    const fetchMock = vi.fn(async () => response);
    await expect(
      createMarketingWithdrawalBrowserClient({ fetch: fetchMock }).withdraw({
        challengeId,
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects a redirected response", async () => {
    const response = json();
    Object.defineProperty(response, "redirected", { value: true });
    const fetchMock = vi.fn(async () => response);
    await expect(
      createMarketingWithdrawalBrowserClient({ fetch: fetchMock }).withdraw({
        challengeId,
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("accepts exactly 4096 response bytes", async () => {
    const body = JSON.stringify(envelope()).padEnd(4096, " ");
    const fetchMock = vi.fn(async () => new Response(body, { headers }));
    await expect(
      createMarketingWithdrawalBrowserClient({ fetch: fetchMock }).withdraw({
        challengeId,
      }),
    ).resolves.toEqual({ ok: true, response: envelope() });
  });

  it.each(["content-length", "stream"] as const)(
    "rejects a 4097-byte %s body",
    async (boundary) => {
      const body = JSON.stringify(envelope()).padEnd(4097, " ");
      const response =
        boundary === "content-length"
          ? new Response(body, {
              headers: { ...headers, "Content-Length": "4097" },
            })
          : new Response(body, { headers });
      await expect(
        createMarketingWithdrawalBrowserClient({
          fetch: vi.fn(async () => response),
        }).withdraw({ challengeId }),
      ).resolves.toEqual({ ok: false, reason: "invalid-response" });
    },
  );

  it("rejects invalid UTF-8", async () => {
    const response = new Response(new Uint8Array([0xff]), { headers });
    await expect(
      createMarketingWithdrawalBrowserClient({
        fetch: vi.fn(async () => response),
      }).withdraw({ challengeId }),
    ).resolves.toEqual({ ok: false, reason: "invalid-response" });
  });

  it("retries a network failure once with the exact same body", async () => {
    vi.useFakeTimers();
    const bodies: BodyInit[] = [];
    const fetchMock = vi.fn<typeof fetch>(async (_path, init) => {
      bodies.push(init?.body ?? "");
      if (bodies.length === 1) throw new Error("private network detail");
      return json();
    });
    const pending = createMarketingWithdrawalBrowserClient({
      fetch: fetchMock,
      random: () => 0,
    }).withdraw({ challengeId });
    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toEqual({ ok: true, response: envelope() });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodies).toEqual([
      JSON.stringify({ schemaVersion: 1, challengeId }),
      JSON.stringify({ schemaVersion: 1, challengeId }),
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries HTTP 503 once and accepts the retry result", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json("service_unavailable", 503))
      .mockResolvedValueOnce(json("already_withdrawn"));
    const pending = createMarketingWithdrawalBrowserClient({
      fetch: fetchMock,
      random: () => 1,
    }).withdraw({ challengeId });
    await vi.advanceTimersByTimeAsync(1500);
    await expect(pending).resolves.toEqual({
      ok: true,
      response: envelope("already_withdrawn"),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns the second eligible failure without a third attempt", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("private network detail");
    });
    const pending = createMarketingWithdrawalBrowserClient({
      fetch: fetchMock,
      random: () => 0,
    }).withdraw({ challengeId });
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toEqual({ ok: false, reason: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a second HTTP 503 without a third attempt", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json("service_unavailable", 503),
    );
    const pending = createMarketingWithdrawalBrowserClient({
      fetch: fetchMock,
      random: () => 0,
    }).withdraw({ challengeId });
    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toEqual({
      ok: true,
      response: envelope("service_unavailable"),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses inclusive retry jitter bounds", async () => {
    vi.useFakeTimers();
    for (const [random, delay] of [
      [-1, 500],
      [2, 1500],
    ] as const) {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValueOnce(json());
      const pending = createMarketingWithdrawalBrowserClient({
        fetch: fetchMock,
        random: () => random,
      }).withdraw({ challengeId });
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(fetchMock).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toEqual({
        ok: true,
        response: envelope(),
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["fetch", "body"] as const)(
    "times out a stalled %s, retries once, and times out the second attempt",
    async (phase) => {
      vi.useFakeTimers();
      const cancel = vi.fn();
      const stalledBody = () =>
        new Response(new ReadableStream({ cancel }), { headers });
      const fetchMock = vi.fn<typeof fetch>(() =>
        phase === "fetch"
          ? new Promise<Response>(() => {})
          : Promise.resolve(stalledBody()),
      );
      const pending = createMarketingWithdrawalBrowserClient({
        fetch: fetchMock,
        random: () => 0,
      }).withdraw({ challengeId });

      await vi.advanceTimersByTimeAsync(5_000);
      expect(fetchMock).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(500);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(5_000);
      await expect(pending).resolves.toEqual({ ok: false, reason: "timeout" });
      expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      expect(fetchMock.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
      if (phase === "body") expect(cancel).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("does not retry a caller pre-abort or in-flight abort", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn<typeof fetch>(() => new Promise(() => {}));
    const client = createMarketingWithdrawalBrowserClient({ fetch: fetchMock });
    await expect(
      client.withdraw({ challengeId }, controller.signal),
    ).resolves.toEqual({ ok: false, reason: "aborted" });
    expect(fetchMock).not.toHaveBeenCalled();

    const active = new AbortController();
    const remove = vi.spyOn(active.signal, "removeEventListener");
    const pending = client.withdraw({ challengeId }, active.signal);
    active.abort();
    await expect(pending).resolves.toEqual({ ok: false, reason: "aborted" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("caller abort cancels retry delay and prevents a second attempt", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("network");
    });
    const pending = createMarketingWithdrawalBrowserClient({
      fetch: fetchMock,
      random: () => 1,
    }).withdraw({ challengeId }, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await expect(pending).resolves.toEqual({ ok: false, reason: "aborted" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("contains a late fetch rejection after caller abort", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let rejectFetch!: (reason: Error) => void;
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((_resolve, reject) => {
          rejectFetch = reject;
        }),
    );
    const pending = createMarketingWithdrawalBrowserClient({
      fetch: fetchMock,
    }).withdraw({ challengeId }, controller.signal);
    controller.abort();
    await expect(pending).resolves.toEqual({ ok: false, reason: "aborted" });

    rejectFetch(new Error("late private network detail"));
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
