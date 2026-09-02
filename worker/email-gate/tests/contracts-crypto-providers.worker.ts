import { describe, expect, it, vi } from "vitest";

import {
  EMAIL_GATE_CHALLENGE_PATH,
  EMAIL_GATE_PRODUCTION_ORIGIN,
  EMAIL_GATE_VERIFICATION_PATH,
} from "../../../src/contracts/email-gate/email-gate-contract";
import { createEmailGateFetchHandler } from "../api";
import {
  createOtpKeyRegistry,
  decodeHexKey,
  deriveOtpV1,
  OtpDerivationError,
  OTP_REJECTION_THRESHOLD,
  timingSafeOtpEqual,
  type HmacSigner,
} from "../crypto/otp";
import {
  createDeliveryPayloadRendererRegistry,
  createTestFixtureRenderer,
} from "../delivery/payload-renderer";
import { createResendAdapter } from "../providers/resend";
import { createTurnstileAdapter } from "../providers/turnstile";
import type { FetchPort } from "../runtime-ports";
import type { EmailGateService } from "../service/email-gate-service";

const TEST_KEY_HEX =
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

describe("OTP derivation", () => {
  it.each([
    ["00000000-0000-4000-8000-000000000000", "83480293"],
    ["00000000-0000-4000-8000-000000000008", "09571651"],
    ["00000000-0000-4000-8000-000000000026", "44124779"],
  ])("reproduces the normative vector for %s", async (challengeId, otp) => {
    const bytes = decodeHexKey(TEST_KEY_HEX);
    expect(bytes).not.toBeNull();
    const registry = createOtpKeyRegistry(1, new Map([[1, bytes!]]));
    const key = await registry.getKey(1);
    expect(key).not.toBeNull();
    await expect(deriveOtpV1(key!, challengeId)).resolves.toBe(otp);
    await expect(deriveOtpV1(key!, challengeId)).resolves.toBe(otp);
  });

  it("rejects the threshold boundary and fails closed after counter 15", async () => {
    const bytes = decodeHexKey(TEST_KEY_HEX)!;
    const key = await createOtpKeyRegistry(1, new Map([[1, bytes]])).getKey(1);
    const counters: number[] = [];
    const rejectedSigner: HmacSigner = async (_key, message) => {
      counters.push(new DataView(message.buffer).getUint32(message.length - 4));
      const digest = new Uint8Array(32);
      new DataView(digest.buffer).setUint32(0, OTP_REJECTION_THRESHOLD, false);
      return digest.buffer;
    };
    await expect(
      deriveOtpV1(key!, "00000000-0000-4000-8000-000000000000", rejectedSigner),
    ).rejects.toBeInstanceOf(OtpDerivationError);
    expect(counters).toEqual(Array.from({ length: 16 }, (_, index) => index));
  });

  it("uses the first accepted candidate and timing-safe Workers comparison", async () => {
    const key = await createOtpKeyRegistry(
      1,
      new Map([[1, new Uint8Array(32)]]),
    ).getKey(1);
    const candidates = [OTP_REJECTION_THRESHOLD, 42];
    const signer: HmacSigner = async () => {
      const digest = new Uint8Array(32);
      new DataView(digest.buffer).setUint32(0, candidates.shift()!, false);
      return digest.buffer;
    };
    await expect(
      deriveOtpV1(key!, "00000000-0000-4000-8000-000000000000", signer),
    ).resolves.toBe("00000042");
    expect(timingSafeOtpEqual("00000042", "00000042")).toBe(true);
    expect(timingSafeOtpEqual("00000043", "00000042")).toBe(false);
    expect(timingSafeOtpEqual("42", "00000042")).toBe(false);
  });

  it("keeps key versions explicit and fails closed when a version is missing", async () => {
    const registry = createOtpKeyRegistry(
      2,
      new Map([
        [1, new Uint8Array(32).fill(1)],
        [2, new Uint8Array(32).fill(2)],
      ]),
    );
    expect(registry.activeVersion).toBe(2);
    expect(await registry.getKey(1)).not.toBeNull();
    expect(await registry.getKey(2)).not.toBeNull();
    expect(await registry.getKey(3)).toBeNull();
  });
});

describe("delivery renderer registry", () => {
  it("retains old immutable renderers and fails closed on a missing version", () => {
    const oldRenderer = createTestFixtureRenderer(1);
    const newRenderer = createTestFixtureRenderer(2);
    const registry = createDeliveryPayloadRendererRegistry(2, [
      oldRenderer,
      newRenderer,
    ]);
    expect(registry.getRenderer(1)).toBe(oldRenderer);
    expect(registry.getRenderer(2)).toBe(newRenderer);
    expect(registry.getRenderer(3)).toBeNull();
    expect(
      registry.getRenderer(1)?.render({
        normalizedEmail: "a@example.com",
        otp: "00000001",
      }),
    ).toEqual({
      from: "Poparooz Test <test@notify.example.invalid>",
      replyTo: "test-replies@example.invalid",
      to: ["a@example.com"],
      subject: "Poparooz test verification fixture",
      text: "Test-only verification code: 00000001",
    });
  });
});

describe("provider adapters", () => {
  it("validates Turnstile success, hostname, and action", async () => {
    const accepted = vi.fn<FetchPort>(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            hostname: "generator.poparooz.com",
            action: "email_gate_issue_v1",
          }),
        ),
    );
    await expect(
      createTurnstileAdapter("test-secret", accepted).validate("x"),
    ).resolves.toBe(true);
    expect(accepted).toHaveBeenCalledOnce();
    const init = accepted.mock.calls[0]?.[1];
    const body = init?.body;
    expect(init?.method).toBe("POST");
    expect(body).toBeInstanceOf(FormData);
    expect(init).not.toHaveProperty("redirect");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    if (!(body instanceof FormData)) throw new TypeError("Expected FormData");
    expect(body.get("secret")).toBe("test-secret");
    expect(body.get("response")).toBe("x");
  });

  it.each([
    [{ success: false }, 200],
    [
      {
        success: true,
        hostname: "wrong.example.com",
        action: "email_gate_issue_v1",
      },
      200,
    ],
    [
      {
        success: true,
        hostname: "generator.poparooz.com",
        action: "wrong",
      },
      200,
    ],
    [{ malformed: true }, 200],
    [{ success: true }, 500],
  ])("fails Turnstile closed for %j / %i", async (body, status) => {
    const fetchPort = vi.fn<FetchPort>(
      async () => new Response(JSON.stringify(body), { status }),
    );
    await expect(
      createTurnstileAdapter("test-secret", fetchPort).validate("token"),
    ).resolves.toBe(false);
  });

  it("fails Turnstile closed on network failure", async () => {
    const fetchPort = vi.fn<FetchPort>(async () => {
      throw new Error("network");
    });
    await expect(
      createTurnstileAdapter("test-secret", fetchPort).validate("token"),
    ).resolves.toBe(false);
  });

  it("fails Turnstile closed at the five-second timeout", async () => {
    vi.useFakeTimers();
    try {
      const fetchPort = vi.fn<FetchPort>(
        async (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      );
      const result = createTurnstileAdapter("test-secret", fetchPort).validate(
        "token",
      );
      await vi.advanceTimersByTimeAsync(5_000);
      await expect(result).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    [201, { id: "provider-id" }, "accepted"],
    [400, { name: "validation_error" }, "definite_reject"],
    [500, { name: "internal_error" }, "ambiguous"],
    [409, { name: "invalid_idempotent_request" }, "changed_payload_conflict"],
    [
      409,
      { name: "concurrent_idempotent_requests" },
      "concurrent_idempotency_conflict",
    ],
  ])("maps Resend %i to %s", async (status, body, outcome) => {
    const fetchPort = vi.fn<FetchPort>(
      async () => new Response(JSON.stringify(body), { status }),
    );
    const adapter = createResendAdapter("test-key", fetchPort);
    await expect(
      adapter.send("event-id", {
        from: "test@example.invalid",
        replyTo: "replies@example.invalid",
        to: ["a@example.com"],
        subject: "test",
        text: "test",
      }),
    ).resolves.toEqual({ outcome });
    const init = fetchPort.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
      "poparooz-email-gate/v1/event-id",
    );
  });

  it.each([
    "rate_limit_exceeded",
    "daily_quota_exceeded",
    "monthly_quota_exceeded",
  ])("maps documented Resend 429 %s to definite rejection", async (name) => {
    const fetchPort = vi.fn<FetchPort>(
      async () =>
        new Response(JSON.stringify({ name, message: "retry later" }), {
          status: 429,
        }),
    );
    await expect(
      createResendAdapter("test-key", fetchPort).send("event", {
        from: "test@example.invalid",
        replyTo: "replies@example.invalid",
        to: ["a@example.com"],
        subject: "test",
        text: "test",
      }),
    ).resolves.toEqual({ outcome: "definite_reject" });
  });

  it.each([
    ["unknown named 409", JSON.stringify({ name: "unknown_conflict" })],
    ["malformed 409 object", JSON.stringify({ message: "conflict" })],
    ["malformed 409 JSON", "{"],
  ])("keeps %s fail-closed and never accepts", async (_label, body) => {
    const fetchPort = vi.fn<FetchPort>(
      async () => new Response(body, { status: 409 }),
    );
    await expect(
      createResendAdapter("test-key", fetchPort).send("event", {
        from: "test@example.invalid",
        replyTo: "replies@example.invalid",
        to: ["a@example.com"],
        subject: "test",
        text: "test",
      }),
    ).resolves.toEqual({ outcome: "definite_reject" });
  });

  it("maps malformed success JSON to ambiguous", async () => {
    const fetchPort = vi.fn<FetchPort>(
      async () => new Response("{", { status: 201 }),
    );
    await expect(
      createResendAdapter("test-key", fetchPort).send("event", {
        from: "test@example.invalid",
        replyTo: "replies@example.invalid",
        to: ["a@example.com"],
        subject: "test",
        text: "test",
      }),
    ).resolves.toEqual({ outcome: "ambiguous" });
  });

  it("reuses identical idempotency identity and payload on same-event retry", async () => {
    const calls: RequestInit[] = [];
    const fetchPort = vi.fn<FetchPort>(async (_input, init) => {
      calls.push(init!);
      return new Response(JSON.stringify({ id: "same" }), { status: 200 });
    });
    const adapter = createResendAdapter("test-key", fetchPort);
    const payload = Object.freeze({
      from: "test@example.invalid",
      replyTo: "replies@example.invalid",
      to: Object.freeze(["a@example.com"]) as readonly [string],
      subject: "test",
      text: "test",
    });
    await adapter.send("stable-event", payload);
    await adapter.send("stable-event", payload);
    expect(calls[0]?.body).toBe(calls[1]?.body);
    expect(new Headers(calls[0]?.headers).get("Idempotency-Key")).toBe(
      new Headers(calls[1]?.headers).get("Idempotency-Key"),
    );
  });

  it("maps replyTo to reply_to through an exact provider field allowlist", async () => {
    const fetchPort = vi.fn<FetchPort>(
      async () => new Response(JSON.stringify({ id: "provider-id" })),
    );
    const payload = {
      from: "test@example.invalid",
      replyTo: "replies@example.invalid",
      to: ["a@example.com"] as const,
      subject: "test",
      text: "plain",
      html: "<p>html</p>",
      unexpected: "must-not-cross-provider-boundary",
    };

    await createResendAdapter("test-key", fetchPort).send("event", payload);

    const body = JSON.parse(
      String(fetchPort.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(body).toEqual({
      from: "test@example.invalid",
      to: ["a@example.com"],
      subject: "test",
      text: "plain",
      html: "<p>html</p>",
      reply_to: "replies@example.invalid",
    });
    expect(Object.keys(body)).toEqual([
      "from",
      "to",
      "subject",
      "text",
      "html",
      "reply_to",
    ]);
    expect(body).not.toHaveProperty("replyTo");
    expect(body).not.toHaveProperty("unexpected");
  });

  it("omits html from the provider body when the neutral payload omits it", async () => {
    const fetchPort = vi.fn<FetchPort>(
      async () => new Response(JSON.stringify({ id: "provider-id" })),
    );
    await createResendAdapter("test-key", fetchPort).send("event", {
      from: "test@example.invalid",
      replyTo: "replies@example.invalid",
      to: ["a@example.com"],
      subject: "test",
      text: "plain",
    });

    const body = JSON.parse(
      String(fetchPort.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(body).toEqual({
      from: "test@example.invalid",
      to: ["a@example.com"],
      subject: "test",
      text: "plain",
      reply_to: "replies@example.invalid",
    });
    expect(body).not.toHaveProperty("html");
  });

  it("maps Resend network failure to ambiguous without throwing", async () => {
    const fetchPort = vi.fn<FetchPort>(async () => {
      throw new Error("network");
    });
    await expect(
      createResendAdapter("test-key", fetchPort).send("event", {
        from: "test@example.invalid",
        replyTo: "replies@example.invalid",
        to: ["a@example.com"],
        subject: "test",
        text: "test",
      }),
    ).resolves.toEqual({ outcome: "ambiguous" });
  });

  it.each([301, 302, 303, 307, 308])(
    "blocks Resend %i redirects without forwarding Authorization",
    async (status) => {
      const redirectTargetRequests: RequestInit[] = [];
      const outboundRequests: RequestInit[] = [];
      const fetchPort = vi.fn<FetchPort>(async (_input, init) => {
        outboundRequests.push(init!);
        if (init?.redirect === "error") {
          throw new TypeError(`redirect ${status} blocked`);
        }
        redirectTargetRequests.push(init!);
        return new Response(JSON.stringify({ id: "redirect-accepted" }), {
          status: 201,
        });
      });

      await expect(
        createResendAdapter("test-key", fetchPort).send("event", {
          from: "test@example.invalid",
          replyTo: "replies@example.invalid",
          to: ["a@example.com"],
          subject: "test",
          text: "test",
        }),
      ).resolves.toEqual({ outcome: "ambiguous" });
      expect(outboundRequests).toHaveLength(1);
      expect(outboundRequests[0]?.redirect).toBe("error");
      expect(redirectTargetRequests).toHaveLength(0);
    },
  );

  it("maps the eight-second Resend timeout to ambiguous", async () => {
    vi.useFakeTimers();
    try {
      const fetchPort = vi.fn<FetchPort>(
        async (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      );
      const result = createResendAdapter("test-key", fetchPort).send("event", {
        from: "test@example.invalid",
        replyTo: "replies@example.invalid",
        to: ["a@example.com"],
        subject: "test",
        text: "test",
      });
      await vi.advanceTimersByTimeAsync(8_000);
      await expect(result).resolves.toEqual({ outcome: "ambiguous" });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("API request and response boundary", () => {
  const service: EmailGateService = Object.freeze({
    issue: vi.fn(async () => ({
      result: "challenge_issued" as const,
      challengeId: "00000000-0000-4000-8000-000000000000",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    })),
    verify: vi.fn(async () => "verification_succeeded" as const),
    scheduled: vi.fn(async () => 0),
  });
  const handler = createEmailGateFetchHandler(service);

  function request(body: string, headers: Record<string, string> = {}) {
    return new Request(
      `https://generator.poparooz.com${EMAIL_GATE_CHALLENGE_PATH}`,
      {
        method: "POST",
        headers: {
          Origin: EMAIL_GATE_PRODUCTION_ORIGIN,
          "Content-Type": "application/json",
          ...headers,
        },
        body,
      },
    );
  }

  it("accepts the exact challenge operation and owns safe headers", async () => {
    const response = await handler(
      request(
        JSON.stringify({
          schemaVersion: 1,
          email: "a@example.com",
          turnstileToken: "token",
        }),
      ),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
      "same-origin",
    );
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(response.headers.has("Set-Cookie")).toBe(false);
  });

  it.each([
    ["wrong origin", { Origin: "https://evil.example" }, 400],
    ["cross-site fetch metadata", { "Sec-Fetch-Site": "cross-site" }, 400],
    ["wrong content type", { "Content-Type": "text/plain" }, 400],
    ["content type casing", { "Content-Type": "Application/JSON" }, 400],
    [
      "content type parameters",
      { "Content-Type": "application/json; charset=utf-8" },
      400,
    ],
  ])("fails closed for %s", async (_label, headers, status) => {
    const baseHeaders =
      "Origin" in headers ? headers : { Origin: EMAIL_GATE_PRODUCTION_ORIGIN };
    const response = await handler(
      request(
        JSON.stringify({
          schemaVersion: 1,
          email: "a@example.com",
          turnstileToken: "token",
        }),
        { ...baseHeaders, ...headers },
      ),
    );
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
  });

  it("fails closed when Origin is missing", async () => {
    const response = await handler(
      new Request(
        `https://generator.poparooz.com${EMAIL_GATE_CHALLENGE_PATH}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemaVersion: 1,
            email: "a@example.com",
            turnstileToken: "token",
          }),
        },
      ),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
  });

  it("rejects malformed, unknown-key, unsupported-version, and oversized bodies", async () => {
    await expect((await handler(request("{"))).json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
    await expect(
      (
        await handler(
          request(
            JSON.stringify({
              schemaVersion: 1,
              email: "a@example.com",
              turnstileToken: "token",
              forbidden: true,
            }),
          ),
        )
      ).json(),
    ).resolves.toEqual({ schemaVersion: 1, result: "invalid_request" });
    await expect(
      (
        await handler(
          request(
            JSON.stringify({
              schemaVersion: 2,
              email: "a@example.com",
              turnstileToken: "token",
            }),
          ),
        )
      ).json(),
    ).resolves.toEqual({ schemaVersion: 1, result: "version_unsupported" });
    const oversized = JSON.stringify({
      schemaVersion: 1,
      email: "a@example.com",
      turnstileToken: "x".repeat(4_096),
    });
    expect(new TextEncoder().encode(oversized).byteLength).toBeGreaterThan(
      4_096,
    );
    await expect((await handler(request(oversized))).json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
  });

  it("accepts exactly 4096 bytes and rejects 4097 bytes", async () => {
    const jsonBody = JSON.stringify({
      schemaVersion: 1,
      email: "a@example.com",
      turnstileToken: "token",
    });
    const exact = jsonBody.padEnd(4_096, " ");
    const over = exact + " ";
    expect(new TextEncoder().encode(exact)).toHaveLength(4_096);
    expect(new TextEncoder().encode(over)).toHaveLength(4_097);
    expect((await handler(request(exact))).status).toBe(201);
    expect((await handler(request(over))).status).toBe(400);
  });

  it("counts streamed bytes without trusting Content-Length", async () => {
    const valid = JSON.stringify({
      schemaVersion: 1,
      email: "a@example.com",
      turnstileToken: "token",
    });
    const absentLength = request(valid);
    expect(absentLength.headers.get("Content-Length")).toBeNull();
    expect((await handler(absentLength)).status).toBe(201);

    const dishonest = request(valid.padEnd(4_097, " "), {
      "Content-Length": "1",
    });
    expect((await handler(dishonest)).status).toBe(400);
    expect(
      (await handler(request(valid, { "Content-Length": "4097" }))).status,
    ).toBe(400);

    const encoder = new TextEncoder();
    function streamedRequest(chunks: readonly string[]): Request {
      return new Request(
        `https://generator.poparooz.com${EMAIL_GATE_CHALLENGE_PATH}`,
        {
          method: "POST",
          headers: {
            Origin: EMAIL_GATE_PRODUCTION_ORIGIN,
            "Content-Type": "application/json",
          },
          body: new ReadableStream({
            start(controller) {
              for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.close();
            },
          }),
        },
      );
    }
    expect(
      (await handler(streamedRequest([valid.slice(0, 17), valid.slice(17)])))
        .status,
    ).toBe(201);
    expect(
      (
        await handler(
          streamedRequest([valid, " ".repeat(4_097 - valid.length)]),
        )
      ).status,
    ).toBe(400);
  });

  it("rejects a multibyte body that crosses the byte limit", async () => {
    const multibyte = JSON.stringify({
      schemaVersion: 1,
      email: "a@example.com",
      turnstileToken: "é".repeat(2_040),
    });
    expect(multibyte.length).toBeLessThanOrEqual(4_096);
    expect(new TextEncoder().encode(multibyte).byteLength).toBeGreaterThan(
      4_096,
    );
    expect((await handler(request(multibyte))).status).toBe(400);
  });

  it.each(["null", "1", '"value"', "[]", "[1]"])(
    "rejects non-object JSON body %s",
    async (body) => {
      expect((await handler(request(body))).status).toBe(400);
    },
  );

  it("uses the single JSON parser's last duplicate key value", async () => {
    vi.mocked(service.issue).mockClear();
    const response = await handler(
      request(
        '{"schemaVersion":1,"email":"bad","email":"a@example.com","turnstileToken":"token"}',
      ),
    );
    expect(response.status).toBe(201);
    expect(service.issue).toHaveBeenCalledWith({
      schemaVersion: 1,
      email: "a@example.com",
      turnstileToken: "token",
    });
  });

  it.each(["GET", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "rejects unsupported method %s",
    async (method) => {
      const response = await handler(
        new Request(
          `https://generator.poparooz.com${EMAIL_GATE_CHALLENGE_PATH}`,
          {
            method,
            headers: {
              Origin: EMAIL_GATE_PRODUCTION_ORIGIN,
              "Content-Type": "application/json",
            },
          },
        ),
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        schemaVersion: 1,
        result: "invalid_request",
      });
    },
  );

  it.each([
    ["verification_succeeded", 200],
    ["verification_invalid", 409],
    ["verification_expired", 409],
    ["verification_locked", 409],
    ["retry_later", 429],
    ["service_unavailable", 503],
  ] as const)(
    "maps verification result %s to HTTP %i",
    async (result, status) => {
      const verificationService: EmailGateService = Object.freeze({
        ...service,
        verify: vi.fn(async () => result),
      });
      const response = await createEmailGateFetchHandler(verificationService)(
        new Request(
          `https://generator.poparooz.com${EMAIL_GATE_VERIFICATION_PATH}`,
          {
            method: "POST",
            headers: {
              Origin: EMAIL_GATE_PRODUCTION_ORIGIN,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              schemaVersion: 1,
              challengeId: "00000000-0000-4000-8000-000000000000",
              code: "00000000",
            }),
          },
        ),
      );
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual(
        result === "verification_succeeded"
          ? { schemaVersion: 1, result, verified: true }
          : { schemaVersion: 1, result },
      );
    },
  );

  it("fails unknown namespace paths closed without redirects", async () => {
    const response = await handler(
      new Request("https://generator.poparooz.com/api/email-gate/v1/unknown", {
        method: "POST",
        headers: {
          Origin: EMAIL_GATE_PRODUCTION_ORIGIN,
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(400);
    expect(response.redirected).toBe(false);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
  });
});
