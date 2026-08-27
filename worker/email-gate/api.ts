import {
  EMAIL_GATE_CHALLENGE_PATH,
  EMAIL_GATE_MAX_BODY_BYTES,
  EMAIL_GATE_PRODUCTION_ORIGIN,
  EMAIL_GATE_SCHEMA_VERSION,
  EMAIL_GATE_VERIFICATION_PATH,
  emailGateChallengeRequestSchema,
  emailGateVerificationRequestSchema,
  type EmailGateFailureResult,
  type EmailGateResponse,
} from "../../src/contracts/email-gate/email-gate-contract";
import type { EmailGateService } from "./service/email-gate-service";

const RESPONSE_HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
});

export function createEmailGateFetchHandler(
  service: EmailGateService,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (!hasApprovedBrowserBoundary(request)) {
        return failure(400, "invalid_request");
      }
      if (request.method !== "POST") return failure(400, "invalid_request");
      if (request.headers.get("Content-Type") !== "application/json") {
        return failure(400, "invalid_request");
      }
      if (
        url.pathname !== EMAIL_GATE_CHALLENGE_PATH &&
        url.pathname !== EMAIL_GATE_VERIFICATION_PATH
      ) {
        return failure(400, "invalid_request");
      }

      const parsedBody = await readBoundedJson(request);
      if (!parsedBody.ok) return failure(400, "invalid_request");
      if (hasUnsupportedVersion(parsedBody.value)) {
        return failure(400, "version_unsupported");
      }

      if (url.pathname === EMAIL_GATE_CHALLENGE_PATH) {
        const parsed = emailGateChallengeRequestSchema.safeParse(
          parsedBody.value,
        );
        if (!parsed.success) return failure(400, "invalid_request");
        const result = await service.issue(parsed.data);
        if (result.result === "challenge_issued") {
          if (
            result.challengeId === undefined ||
            result.expiresInSeconds === undefined ||
            result.resendAfterSeconds === undefined
          ) {
            return failure(503, "service_unavailable");
          }
          return json(
            201,
            Object.freeze({
              schemaVersion: EMAIL_GATE_SCHEMA_VERSION,
              result: "challenge_issued" as const,
              challengeId: result.challengeId,
              expiresInSeconds: result.expiresInSeconds,
              resendAfterSeconds: result.resendAfterSeconds,
            }),
          );
        }
        return result.result === "invalid_request"
          ? failure(400, result.result)
          : result.result === "retry_later"
            ? failure(429, result.result)
            : failure(503, "service_unavailable");
      }

      const parsed = emailGateVerificationRequestSchema.safeParse(
        parsedBody.value,
      );
      if (!parsed.success) return failure(400, "invalid_request");
      const result = await service.verify(parsed.data);
      if (result === "verification_succeeded") {
        return json(
          200,
          Object.freeze({
            schemaVersion: EMAIL_GATE_SCHEMA_VERSION,
            result,
            verified: true as const,
          }),
        );
      }
      if (
        result === "verification_invalid" ||
        result === "verification_expired" ||
        result === "verification_locked"
      ) {
        return failure(409, result);
      }
      return result === "retry_later"
        ? failure(429, result)
        : failure(503, "service_unavailable");
    } catch {
      return failure(503, "service_unavailable");
    }
  };
}

function hasApprovedBrowserBoundary(request: Request): boolean {
  if (request.headers.get("Origin") !== EMAIL_GATE_PRODUCTION_ORIGIN) {
    return false;
  }
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  return fetchSite === null || fetchSite === "same-origin";
}

type BoundedJsonResult =
  Readonly<{ ok: true; value: unknown }> | Readonly<{ ok: false }>;

async function readBoundedJson(request: Request): Promise<BoundedJsonResult> {
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > EMAIL_GATE_MAX_BODY_BYTES
    ) {
      return Object.freeze({ ok: false });
    }
  }

  const reader = request.body?.getReader();
  if (reader === undefined) return Object.freeze({ ok: false });
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > EMAIL_GATE_MAX_BODY_BYTES) {
        await reader.cancel();
        return Object.freeze({ ok: false });
      }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return Object.freeze({
      ok: true,
      value: JSON.parse(new TextDecoder().decode(bytes)) as unknown,
    });
  } catch {
    return Object.freeze({ ok: false });
  }
}

function hasUnsupportedVersion(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion !== EMAIL_GATE_SCHEMA_VERSION
  );
}

function failure(status: number, result: EmailGateFailureResult): Response {
  return json(
    status,
    Object.freeze({ schemaVersion: EMAIL_GATE_SCHEMA_VERSION, result }),
  );
}

function json(status: number, body: EmailGateResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}
