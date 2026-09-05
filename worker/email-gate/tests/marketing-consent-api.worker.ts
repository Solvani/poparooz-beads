import { describe, expect, it, vi } from "vitest";

import {
  MARKETING_CONSENT_GRANT_PATH,
  MARKETING_CONSENT_PRODUCTION_ORIGIN,
  MARKETING_CONSENT_VERSION,
  MARKETING_CONSENT_WITHDRAWAL_PATH,
} from "../../../src/contracts/marketing-consent/marketing-consent-contract";
import { createMarketingConsentFetchHandler } from "../marketing-consent/api";
import type { MarketingConsentService } from "../service/marketing-consent-service";

describe("Marketing Consent API boundary", () => {
  const grant = vi.fn(async () => "grant_persisted" as const);
  const withdraw = vi.fn(async () => "withdrawn" as const);
  const service: MarketingConsentService = Object.freeze({ grant, withdraw });
  const handler = createMarketingConsentFetchHandler(service);

  function validBody(): string {
    return JSON.stringify({
      schemaVersion: 1,
      challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
      consentVersion: MARKETING_CONSENT_VERSION,
      affirmativeIntent: true,
    });
  }

  function validWithdrawalBody(): string {
    return JSON.stringify({
      schemaVersion: 1,
      challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
    });
  }

  function request(
    body: string | undefined = validBody(),
    options: Readonly<{
      method?: string;
      path?: string;
      headers?: Record<string, string>;
    }> = {},
  ): Request {
    const method = options.method ?? "POST";
    return new Request(
      `https://generator.poparooz.com${options.path ?? MARKETING_CONSENT_GRANT_PATH}`,
      {
        method,
        headers: {
          Origin: MARKETING_CONSENT_PRODUCTION_ORIGIN,
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: method === "GET" || method === "HEAD" ? undefined : body,
      },
    );
  }

  it("accepts the exact POST and returns only the frozen no-store envelope", async () => {
    grant.mockClear();
    const response = await handler(request());
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.redirected).toBe(false);
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
    expect(new TextEncoder().encode(text).byteLength).toBeLessThanOrEqual(
      4_096,
    );
    expect(JSON.parse(text)).toEqual({
      schemaVersion: 1,
      result: "grant_persisted",
    });
    expect(grant).toHaveBeenCalledOnce();
  });

  it.each([
    ["grant_persisted", 200],
    ["already_active", 200],
    ["verification_authority_invalid", 409],
    ["service_unavailable", 503],
  ] as const)("maps %s to HTTP %i", async (result, status) => {
    const mappedService: MarketingConsentService = Object.freeze({
      grant: vi.fn(async () => result),
      withdraw,
    });
    const response =
      await createMarketingConsentFetchHandler(mappedService)(request());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result,
    });
  });

  it.each(["GET", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "rejects unsupported method %s before service execution",
    async (method) => {
      grant.mockClear();
      const response = await handler(request(undefined, { method }));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        schemaVersion: 1,
        result: "invalid_request",
      });
      expect(grant).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["wrong media type", { "Content-Type": "text/plain" }],
    ["content type casing", { "Content-Type": "Application/JSON" }],
    [
      "content type parameters",
      { "Content-Type": "application/json; charset=utf-8" },
    ],
    ["wrong origin", { Origin: "https://poparooz.com" }],
    ["cross-site fetch", { "Sec-Fetch-Site": "cross-site" }],
  ])("fails closed for %s", async (_label, headers) => {
    grant.mockClear();
    const response = await handler(request(validBody(), { headers }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
    expect(grant).not.toHaveBeenCalled();
  });

  it("rejects a missing Origin", async () => {
    grant.mockClear();
    const response = await handler(
      new Request(
        `https://generator.poparooz.com${MARKETING_CONSENT_GRANT_PATH}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: validBody(),
        },
      ),
    );
    expect(response.status).toBe(400);
    expect(grant).not.toHaveBeenCalled();
  });

  it.each(["", "{", "null", "[]"])(
    "rejects malformed or non-object body %j",
    async (body) => {
      grant.mockClear();
      const response = await handler(request(body));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        schemaVersion: 1,
        result: "invalid_request",
      });
      expect(grant).not.toHaveBeenCalled();
    },
  );

  const validVersionRequest = JSON.parse(validBody()) as Record<
    string,
    unknown
  >;

  it.each([
    [
      "otherwise valid unsupported schemaVersion",
      { ...validVersionRequest, schemaVersion: 2 },
      "version_unsupported",
    ],
    [
      "unsupported schemaVersion with unknown field",
      { ...validVersionRequest, schemaVersion: 2, unknown: true },
      "invalid_request",
    ],
    [
      "unsupported schemaVersion with false intent",
      {
        ...validVersionRequest,
        schemaVersion: 2,
        affirmativeIntent: false,
      },
      "invalid_request",
    ],
    [
      "unsupported schemaVersion with missing intent",
      {
        schemaVersion: 2,
        challengeId: validVersionRequest.challengeId,
        consentVersion: validVersionRequest.consentVersion,
      },
      "invalid_request",
    ],
    [
      "unsupported schemaVersion with invalid challengeId",
      {
        ...validVersionRequest,
        schemaVersion: 2,
        challengeId: "not-a-challenge-id",
      },
      "invalid_request",
    ],
    [
      "unsupported schemaVersion with wrong consentVersion",
      {
        ...validVersionRequest,
        schemaVersion: 2,
        consentVersion: "marketing-consent-v2.0.0",
      },
      "invalid_request",
    ],
    [
      "unsupported schemaVersion with missing consentVersion",
      {
        schemaVersion: 2,
        challengeId: validVersionRequest.challengeId,
        affirmativeIntent: true,
      },
      "invalid_request",
    ],
    [
      "missing schemaVersion",
      {
        challengeId: validVersionRequest.challengeId,
        consentVersion: validVersionRequest.consentVersion,
        affirmativeIntent: true,
      },
      "invalid_request",
    ],
    [
      "supported schemaVersion with wrong consentVersion",
      {
        ...validVersionRequest,
        consentVersion: "marketing-consent-v2.0.0",
      },
      "invalid_request",
    ],
    [
      "non-integer schemaVersion",
      { ...validVersionRequest, schemaVersion: 2.5 },
      "invalid_request",
    ],
  ] as const)("classifies %s", async (_label, body, result) => {
    grant.mockClear();
    const response = await handler(request(JSON.stringify(body)));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result,
    });
    expect(grant).not.toHaveBeenCalled();
  });

  it("rejects unknown Marketing paths without invoking either service operation", async () => {
    grant.mockClear();
    withdraw.mockClear();
    const response = await handler(
      request(validBody(), {
        path: "/api/marketing-consent/v1/unknown",
      }),
    );
    expect(response.status).toBe(400);
    expect(response.redirected).toBe(false);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
    expect(grant).not.toHaveBeenCalled();
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("accepts 4096 bytes and rejects normal and streamed bodies above it", async () => {
    const exact = validBody().padEnd(4_096, " ");
    const over = `${exact} `;
    expect(new TextEncoder().encode(exact)).toHaveLength(4_096);
    expect(new TextEncoder().encode(over)).toHaveLength(4_097);
    expect((await handler(request(exact))).status).toBe(200);
    expect((await handler(request(over))).status).toBe(400);

    const encoder = new TextEncoder();
    const streamed = new Request(
      `https://generator.poparooz.com${MARKETING_CONSENT_GRANT_PATH}`,
      {
        method: "POST",
        headers: {
          Origin: MARKETING_CONSENT_PRODUCTION_ORIGIN,
          "Content-Type": "application/json",
        },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(validBody()));
            controller.enqueue(
              encoder.encode(" ".repeat(4_097 - validBody().length)),
            );
            controller.close();
          },
        }),
      },
    );
    expect((await handler(streamed)).status).toBe(400);
  });

  it("does not leak server-owned or persistence fields", async () => {
    const response = await handler(request());
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["schemaVersion", "result"]);
    for (const field of [
      "email",
      "canonicalEmail",
      "challengeCreatedAt",
      "challengeVerifiedAt",
      "subscriptionId",
      "eventId",
      "operationKey",
      "stateVersion",
      "provider",
      "d1",
    ]) {
      expect(body).not.toHaveProperty(field);
    }
  });

  it("accepts the exact withdrawal POST with the shared security envelope", async () => {
    grant.mockClear();
    withdraw.mockClear();
    const response = await handler(
      request(validWithdrawalBody(), {
        path: MARKETING_CONSENT_WITHDRAWAL_PATH,
      }),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.redirected).toBe(false);
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
      "same-origin",
    );
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(response.headers.has("Access-Control-Allow-Credentials")).toBe(
      false,
    );
    expect(response.headers.has("Set-Cookie")).toBe(false);
    expect(new TextEncoder().encode(text).byteLength).toBeLessThanOrEqual(
      4_096,
    );
    expect(JSON.parse(text)).toEqual({ schemaVersion: 1, result: "withdrawn" });
    expect(withdraw).toHaveBeenCalledOnce();
    expect(grant).not.toHaveBeenCalled();
  });

  it.each([
    ["withdrawn", 200],
    ["already_withdrawn", 200],
    ["not_active", 200],
    ["verification_authority_invalid", 409],
    ["service_unavailable", 503],
  ] as const)(
    "maps withdrawal result %s to HTTP %i",
    async (result, status) => {
      const mappedService: MarketingConsentService = Object.freeze({
        grant,
        withdraw: vi.fn(async () => result),
      });
      const response = await createMarketingConsentFetchHandler(mappedService)(
        request(validWithdrawalBody(), {
          path: MARKETING_CONSENT_WITHDRAWAL_PATH,
        }),
      );
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({
        schemaVersion: 1,
        result,
      });
    },
  );

  it.each(["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "rejects withdrawal method %s before service execution",
    async (method) => {
      withdraw.mockClear();
      const response = await handler(
        request(undefined, { method, path: MARKETING_CONSENT_WITHDRAWAL_PATH }),
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        schemaVersion: 1,
        result: "invalid_request",
      });
      expect(withdraw).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "charset content type",
      { "Content-Type": "application/json; charset=utf-8" },
    ],
    ["missing content type", { "Content-Type": "" }],
    ["wrong origin", { Origin: "https://poparooz.com" }],
    ["missing origin", { Origin: "" }],
    ["cross-site fetch", { "Sec-Fetch-Site": "cross-site" }],
  ])("fails closed for withdrawal %s", async (_label, headers) => {
    withdraw.mockClear();
    const response = await handler(
      request(validWithdrawalBody(), {
        path: MARKETING_CONSENT_WITHDRAWAL_PATH,
        headers,
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "invalid_request",
    });
    expect(withdraw).not.toHaveBeenCalled();
  });

  it.each(["", "{", "null", "[]"])(
    "rejects malformed withdrawal body %j",
    async (body) => {
      withdraw.mockClear();
      const response = await handler(
        request(body, { path: MARKETING_CONSENT_WITHDRAWAL_PATH }),
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        schemaVersion: 1,
        result: "invalid_request",
      });
      expect(withdraw).not.toHaveBeenCalled();
    },
  );

  it("enforces the withdrawal body limit for normal and streamed bodies", async () => {
    const exact = validWithdrawalBody().padEnd(4_096, " ");
    const over = `${exact} `;
    expect(new TextEncoder().encode(exact)).toHaveLength(4_096);
    expect(new TextEncoder().encode(over)).toHaveLength(4_097);
    expect(
      (
        await handler(
          request(exact, { path: MARKETING_CONSENT_WITHDRAWAL_PATH }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handler(
          request(over, { path: MARKETING_CONSENT_WITHDRAWAL_PATH }),
        )
      ).status,
    ).toBe(400);

    const encoder = new TextEncoder();
    const streamed = new Request(
      `https://generator.poparooz.com${MARKETING_CONSENT_WITHDRAWAL_PATH}`,
      {
        method: "POST",
        headers: {
          Origin: MARKETING_CONSENT_PRODUCTION_ORIGIN,
          "Content-Type": "application/json",
        },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(validWithdrawalBody()));
            controller.enqueue(
              encoder.encode(" ".repeat(4_097 - validWithdrawalBody().length)),
            );
            controller.close();
          },
        }),
      },
    );
    expect((await handler(streamed)).status).toBe(400);
  });

  it.each([
    [
      "otherwise valid unsupported schemaVersion",
      {
        schemaVersion: 2,
        challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
      },
      "version_unsupported",
    ],
    [
      "unsupported schemaVersion with unknown field",
      {
        schemaVersion: 2,
        challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
        unknown: true,
      },
      "invalid_request",
    ],
    [
      "unsupported schemaVersion with email",
      {
        schemaVersion: 2,
        challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
        email: "forbidden@example.invalid",
      },
      "invalid_request",
    ],
    [
      "unsupported schemaVersion without challengeId",
      { schemaVersion: 2 },
      "invalid_request",
    ],
    [
      "string schemaVersion",
      {
        schemaVersion: "2",
        challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
      },
      "invalid_request",
    ],
  ] as const)("classifies withdrawal %s", async (_label, body, result) => {
    withdraw.mockClear();
    const response = await handler(
      request(JSON.stringify(body), {
        path: MARKETING_CONSENT_WITHDRAWAL_PATH,
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result,
    });
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("does not leak server-owned or persistence fields from withdrawal", async () => {
    const response = await handler(
      request(validWithdrawalBody(), {
        path: MARKETING_CONSENT_WITHDRAWAL_PATH,
      }),
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["schemaVersion", "result"]);
    for (const field of [
      "email",
      "canonicalEmail",
      "challengeCreatedAt",
      "challengeVerifiedAt",
      "timestamp",
      "subscriptionId",
      "eventId",
      "operationKey",
      "stateVersion",
      "provider",
      "d1",
      "error",
    ]) {
      expect(body).not.toHaveProperty(field);
    }
  });

  it.each([
    "email",
    "timestamp",
    "eventId",
    "operationKey",
    "subscriptionId",
    "consentVersion",
    "affirmativeIntent",
    "sourceContext",
    "pattern",
    "image",
    "png",
    "materials",
    "colors",
    "shopify",
    "provider",
    "unknown",
  ])(
    "rejects withdrawal client field %s before either operation",
    async (field) => {
      grant.mockClear();
      withdraw.mockClear();
      const response = await handler(
        request(
          JSON.stringify({
            schemaVersion: 1,
            challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
            [field]: "forbidden",
          }),
          { path: MARKETING_CONSENT_WITHDRAWAL_PATH },
        ),
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        schemaVersion: 1,
        result: "invalid_request",
      });
      expect(grant).not.toHaveBeenCalled();
      expect(withdraw).not.toHaveBeenCalled();
    },
  );

  it("maps unexpected withdrawal service failure to a closed 503 envelope", async () => {
    const failingService: MarketingConsentService = {
      grant,
      withdraw: vi.fn(async () => {
        throw new Error("private persistence detail");
      }),
    };
    const response = await createMarketingConsentFetchHandler(failingService)(
      request(validWithdrawalBody(), {
        path: MARKETING_CONSENT_WITHDRAWAL_PATH,
      }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      result: "service_unavailable",
    });
  });
});
