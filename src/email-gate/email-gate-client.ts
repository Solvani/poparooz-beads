import {
  EMAIL_GATE_CHALLENGE_PATH,
  EMAIL_GATE_MAX_BODY_BYTES,
  EMAIL_GATE_SCHEMA_VERSION,
  EMAIL_GATE_VERIFICATION_PATH,
  emailGateChallengeRequestSchema,
  emailGateResponseSchema,
  emailGateVerificationRequestSchema,
  type EmailGateResponse,
} from "../contracts/email-gate/email-gate-contract";

const EMAIL_GATE_JSON_MEDIA_TYPE = "application/json; charset=utf-8";
const DEFAULT_TIMEOUT_MS = 10_000;

export type EmailGateClientResult =
  | Readonly<{ ok: true; response: EmailGateResponse }>
  | Readonly<{
      ok: false;
      reason: "aborted" | "network" | "invalid-response";
    }>;

export interface EmailGateBrowserClient {
  issueChallenge(
    input: Readonly<{ email: string; turnstileToken: string }>,
    signal?: AbortSignal,
  ): Promise<EmailGateClientResult>;
  verifyChallenge(
    input: Readonly<{ challengeId: string; code: string }>,
    signal?: AbortSignal,
  ): Promise<EmailGateClientResult>;
}

export interface EmailGateClientEnvironment {
  readonly fetch: typeof fetch;
  readonly timeoutMs?: number;
}

export function createEmailGateBrowserClient(
  environment: EmailGateClientEnvironment = {
    fetch: window.fetch.bind(window),
  },
): EmailGateBrowserClient {
  return Object.freeze({
    issueChallenge(
      input: Readonly<{ email: string; turnstileToken: string }>,
      signal?: AbortSignal,
    ) {
      const body = emailGateChallengeRequestSchema.parse({
        schemaVersion: EMAIL_GATE_SCHEMA_VERSION,
        email: input.email,
        turnstileToken: input.turnstileToken,
      });
      return request(
        EMAIL_GATE_CHALLENGE_PATH,
        body,
        "issue",
        environment,
        signal,
      );
    },
    verifyChallenge(
      input: Readonly<{ challengeId: string; code: string }>,
      signal?: AbortSignal,
    ) {
      const body = emailGateVerificationRequestSchema.parse({
        schemaVersion: EMAIL_GATE_SCHEMA_VERSION,
        challengeId: input.challengeId,
        code: input.code,
      });
      return request(
        EMAIL_GATE_VERIFICATION_PATH,
        body,
        "verify",
        environment,
        signal,
      );
    },
  });
}

async function request(
  path: string,
  body: object,
  operation: "issue" | "verify",
  environment: EmailGateClientEnvironment,
  externalSignal?: AbortSignal,
): Promise<EmailGateClientResult> {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
  const timeout = window.setTimeout(
    () => controller.abort(),
    environment.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    if (externalSignal?.aborted) controller.abort();
    const response = await environment.fetch(path, {
      method: "POST",
      credentials: "omit",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (
      response.redirected ||
      response.headers.get("Content-Type") !== EMAIL_GATE_JSON_MEDIA_TYPE ||
      !isAllowedStatus(operation, response.status)
    ) {
      return { ok: false, reason: "invalid-response" };
    }
    const text = await readBoundedResponseBody(response);
    if (text === null) {
      return { ok: false, reason: "invalid-response" };
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return { ok: false, reason: "invalid-response" };
    }
    const parsed = emailGateResponseSchema.safeParse(value);
    if (
      !parsed.success ||
      !isAllowedPair(operation, response.status, parsed.data.result)
    ) {
      return { ok: false, reason: "invalid-response" };
    }
    return { ok: true, response: parsed.data };
  } catch {
    return {
      ok: false,
      reason: controller.signal.aborted ? "aborted" : "network",
    };
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

async function readBoundedResponseBody(response: Response) {
  const contentLength = response.headers.get("Content-Length");
  if (
    contentLength !== null &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > EMAIL_GATE_MAX_BODY_BYTES
  ) {
    return null;
  }
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > EMAIL_GATE_MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

function isAllowedStatus(operation: "issue" | "verify", status: number) {
  return operation === "issue"
    ? [201, 400, 429, 503].includes(status)
    : [200, 400, 409, 429, 503].includes(status);
}

function isAllowedPair(
  operation: "issue" | "verify",
  status: number,
  result: EmailGateResponse["result"],
) {
  const key = `${status}:${result}`;
  return operation === "issue"
    ? [
        "201:challenge_issued",
        "400:invalid_request",
        "400:version_unsupported",
        "429:retry_later",
        "503:service_unavailable",
      ].includes(key)
    : [
        "200:verification_succeeded",
        "400:invalid_request",
        "400:version_unsupported",
        "409:verification_invalid",
        "409:verification_expired",
        "409:verification_locked",
        "429:retry_later",
        "503:service_unavailable",
      ].includes(key);
}
