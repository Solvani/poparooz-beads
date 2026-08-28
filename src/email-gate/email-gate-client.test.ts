import { describe, expect, it, vi } from "vitest";

import { createEmailGateBrowserClient } from "./email-gate-client";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const CHALLENGE_ID = "abcdefab-cdef-4abc-8def-abcdefabcdef";

function jsonResponse(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function issueSuccess() {
  return {
    schemaVersion: 1,
    result: "challenge_issued",
    challengeId: CHALLENGE_ID,
    expiresInSeconds: 580,
    resendAfterSeconds: 45,
  };
}

describe("Email Gate browser API client", () => {
  it("uses the strict shared request and locked-down fetch options", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(issueSuccess()));
    const client = createEmailGateBrowserClient({ fetch: fetchMock });
    await expect(
      client.issueChallenge({
        email: "Name@example.com",
        turnstileToken: "fresh-proof",
      }),
    ).resolves.toEqual({ ok: true, response: issueSuccess() });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/email-gate/v1/challenges",
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
        redirect: "error",
        body: JSON.stringify({
          schemaVersion: 1,
          email: "Name@example.com",
          turnstileToken: "fresh-proof",
        }),
      }),
    );
  });

  it.each([
    [
      "wrong content type",
      new Response("{}", {
        status: 201,
        headers: { "Content-Type": "text/html" },
      }),
    ],
    [
      "HTML fallback",
      new Response("<html></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    ],
    [
      "malformed JSON",
      new Response("{", { status: 201, headers: JSON_HEADERS }),
    ],
    [
      "oversized JSON",
      new Response(`{"padding":"${"x".repeat(4_097)}"}`, {
        status: 201,
        headers: JSON_HEADERS,
      }),
    ],
    [
      "unknown fields",
      jsonResponse({ ...issueSuccess(), provider: "forbidden" }),
    ],
    [
      "unsupported version",
      jsonResponse({ ...issueSuccess(), schemaVersion: 2 }),
    ],
    [
      "404 route response",
      jsonResponse({ schemaVersion: 1, result: "invalid_request" }, 404),
    ],
    [
      "405 route response",
      jsonResponse({ schemaVersion: 1, result: "invalid_request" }, 405),
    ],
    ["invalid status/result pair", jsonResponse(issueSuccess(), 200)],
  ])("fails closed for %s", async (_name, response) => {
    const client = createEmailGateBrowserClient({
      fetch: vi.fn(async () => response),
    });
    await expect(
      client.issueChallenge({ email: "a@example.com", turnstileToken: "x" }),
    ).resolves.toEqual({ ok: false, reason: "invalid-response" });
  });

  it("fails closed when the browser reports a redirect", async () => {
    const response = jsonResponse(issueSuccess());
    Object.defineProperty(response, "redirected", { value: true });
    const client = createEmailGateBrowserClient({
      fetch: vi.fn(async () => response),
    });
    await expect(
      client.issueChallenge({ email: "a@example.com", turnstileToken: "x" }),
    ).resolves.toEqual({ ok: false, reason: "invalid-response" });
  });

  it("maps network and abort failures without exposing internals", async () => {
    const networkClient = createEmailGateBrowserClient({
      fetch: vi.fn(async () => {
        throw new Error("provider detail");
      }),
    });
    await expect(
      networkClient.issueChallenge({
        email: "a@example.com",
        turnstileToken: "x",
      }),
    ).resolves.toEqual({ ok: false, reason: "network" });

    const controller = new AbortController();
    controller.abort();
    const abortClient = createEmailGateBrowserClient({
      fetch: vi.fn(async (_input, init) => {
        if (init?.signal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        return jsonResponse(issueSuccess());
      }),
    });
    await expect(
      abortClient.issueChallenge(
        { email: "a@example.com", turnstileToken: "x" },
        controller.signal,
      ),
    ).resolves.toEqual({ ok: false, reason: "aborted" });
  });

  it("accepts only the frozen verification success pair", async () => {
    const client = createEmailGateBrowserClient({
      fetch: vi.fn(async () =>
        jsonResponse(
          {
            schemaVersion: 1,
            result: "verification_succeeded",
            verified: true,
          },
          200,
        ),
      ),
    });
    await expect(
      client.verifyChallenge({ challengeId: CHALLENGE_ID, code: "01234567" }),
    ).resolves.toEqual({
      ok: true,
      response: {
        schemaVersion: 1,
        result: "verification_succeeded",
        verified: true,
      },
    });
  });

  it.each([
    [400, "invalid_request"],
    [400, "version_unsupported"],
    [429, "retry_later"],
    [503, "service_unavailable"],
  ] as const)("accepts issue result %s:%s", async (status, result) => {
    const client = createEmailGateBrowserClient({
      fetch: vi.fn(async () =>
        jsonResponse({ schemaVersion: 1, result }, status),
      ),
    });
    await expect(
      client.issueChallenge({ email: "a@example.com", turnstileToken: "x" }),
    ).resolves.toEqual({
      ok: true,
      response: { schemaVersion: 1, result },
    });
  });

  it.each([
    [400, "invalid_request"],
    [400, "version_unsupported"],
    [409, "verification_invalid"],
    [409, "verification_expired"],
    [409, "verification_locked"],
    [429, "retry_later"],
    [503, "service_unavailable"],
  ] as const)("accepts verify result %s:%s", async (status, result) => {
    const client = createEmailGateBrowserClient({
      fetch: vi.fn(async () =>
        jsonResponse({ schemaVersion: 1, result }, status),
      ),
    });
    await expect(
      client.verifyChallenge({ challengeId: CHALLENGE_ID, code: "01234567" }),
    ).resolves.toEqual({
      ok: true,
      response: { schemaVersion: 1, result },
    });
  });

  it.each([404, 405])(
    "rejects verification route status %s",
    async (status) => {
      const client = createEmailGateBrowserClient({
        fetch: vi.fn(async () =>
          jsonResponse({ schemaVersion: 1, result: "invalid_request" }, status),
        ),
      });
      await expect(
        client.verifyChallenge({ challengeId: CHALLENGE_ID, code: "01234567" }),
      ).resolves.toEqual({ ok: false, reason: "invalid-response" });
    },
  );

  it.each([
    ["issue", 201, "invalid_request"],
    ["issue", 400, "verification_invalid"],
    ["issue", 409, "verification_invalid"],
    ["verify", 200, "challenge_issued"],
    ["verify", 400, "verification_invalid"],
    ["verify", 409, "invalid_request"],
  ] as const)(
    "rejects invalid %s pair %s:%s",
    async (operation, status, result) => {
      const client = createEmailGateBrowserClient({
        fetch: vi.fn(async () =>
          jsonResponse(
            result === "challenge_issued"
              ? issueSuccess()
              : { schemaVersion: 1, result },
            status,
          ),
        ),
      });
      const response =
        operation === "issue"
          ? client.issueChallenge({
              email: "a@example.com",
              turnstileToken: "x",
            })
          : client.verifyChallenge({
              challengeId: CHALLENGE_ID,
              code: "01234567",
            });
      await expect(response).resolves.toEqual({
        ok: false,
        reason: "invalid-response",
      });
    },
  );
});
