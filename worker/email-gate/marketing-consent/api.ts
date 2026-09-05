import {
  MARKETING_CONSENT_GRANT_PATH,
  MARKETING_CONSENT_MAX_BODY_BYTES,
  MARKETING_CONSENT_PRODUCTION_ORIGIN,
  MARKETING_CONSENT_SCHEMA_VERSION,
  marketingConsentGrantRequestSchema,
  type MarketingConsentResponse,
  type MarketingConsentResponseResult,
} from "../../../src/contracts/marketing-consent/marketing-consent-contract";
import type { MarketingConsentService } from "../service/marketing-consent-service";

const RESPONSE_HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
});

export function createMarketingConsentFetchHandler(
  service: MarketingConsentService,
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
      if (url.pathname !== MARKETING_CONSENT_GRANT_PATH) {
        return failure(400, "invalid_request");
      }

      const parsedBody = await readBoundedJson(request);
      if (!parsedBody.ok) return failure(400, "invalid_request");
      const parsed = marketingConsentGrantRequestSchema.safeParse(
        parsedBody.value,
      );
      if (!parsed.success) {
        return hasRecognizedUnsupportedSchemaVersion(parsedBody.value)
          ? failure(400, "version_unsupported")
          : failure(400, "invalid_request");
      }

      const result = await service.grant(parsed.data);
      if (result === "grant_persisted" || result === "already_active") {
        return json(200, result);
      }
      return result === "verification_authority_invalid"
        ? failure(409, result)
        : failure(503, "service_unavailable");
    } catch {
      return failure(503, "service_unavailable");
    }
  };
}

function hasApprovedBrowserBoundary(request: Request): boolean {
  if (request.headers.get("Origin") !== MARKETING_CONSENT_PRODUCTION_ORIGIN) {
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
      parsedLength > MARKETING_CONSENT_MAX_BODY_BYTES
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
      if (total > MARKETING_CONSENT_MAX_BODY_BYTES) {
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

function hasRecognizedUnsupportedSchemaVersion(value: unknown): boolean {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("schemaVersion" in value) ||
    !Number.isSafeInteger(value.schemaVersion) ||
    value.schemaVersion === MARKETING_CONSENT_SCHEMA_VERSION
  ) {
    return false;
  }

  return marketingConsentGrantRequestSchema.safeParse({
    ...value,
    schemaVersion: MARKETING_CONSENT_SCHEMA_VERSION,
  }).success;
}

function failure(
  status: number,
  result: MarketingConsentResponseResult,
): Response {
  return json(status, result);
}

function json(
  status: number,
  result: MarketingConsentResponse["result"],
): Response {
  return new Response(
    JSON.stringify(
      Object.freeze({
        schemaVersion: MARKETING_CONSENT_SCHEMA_VERSION,
        result,
      }),
    ),
    { status, headers: RESPONSE_HEADERS },
  );
}
