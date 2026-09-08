import {
  MARKETING_CONSENT_MAX_BODY_BYTES,
  MARKETING_CONSENT_SCHEMA_VERSION,
  MARKETING_CONSENT_WITHDRAWAL_PATH,
  marketingConsentResponseSchema,
  marketingConsentWithdrawalRequestSchema,
  type MarketingConsentResponse,
} from "../../contracts/marketing-consent/marketing-consent-contract";

const JSON_MEDIA_TYPE = "application/json; charset=utf-8";
const TIMEOUT_MS = 5_000;
const MIN_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 1_500;
const inputSchema = marketingConsentWithdrawalRequestSchema.pick({
  challengeId: true,
});

type MarketingWithdrawalResultName =
  | "withdrawn"
  | "already_withdrawn"
  | "not_active"
  | "invalid_request"
  | "version_unsupported"
  | "verification_authority_invalid"
  | "service_unavailable";

export type MarketingWithdrawalResponse = Readonly<{
  schemaVersion: typeof MARKETING_CONSENT_SCHEMA_VERSION;
  result: MarketingWithdrawalResultName;
}>;

export type MarketingWithdrawalClientResult =
  | Readonly<{ ok: true; response: MarketingWithdrawalResponse }>
  | Readonly<{
      ok: false;
      reason:
        | "invalid-request"
        | "invalid-response"
        | "network"
        | "timeout"
        | "aborted";
    }>;

export interface MarketingWithdrawalBrowserClient {
  withdraw(
    input: Readonly<{ challengeId: string }>,
    signal?: AbortSignal,
  ): Promise<MarketingWithdrawalClientResult>;
}

export interface MarketingWithdrawalClientEnvironment {
  readonly fetch: typeof fetch;
  readonly random?: () => number;
}

export function createMarketingWithdrawalBrowserClient(
  environment: MarketingWithdrawalClientEnvironment = {
    fetch: window.fetch.bind(window),
  },
): MarketingWithdrawalBrowserClient {
  return Object.freeze({
    async withdraw(
      input: Readonly<{ challengeId: string }>,
      signal?: AbortSignal,
    ): Promise<MarketingWithdrawalClientResult> {
      const parsed = inputSchema.safeParse(input);
      if (!parsed.success) return { ok: false, reason: "invalid-request" };
      if (signal?.aborted) return { ok: false, reason: "aborted" };

      const body = JSON.stringify(
        marketingConsentWithdrawalRequestSchema.parse({
          schemaVersion: MARKETING_CONSENT_SCHEMA_VERSION,
          challengeId: parsed.data.challengeId,
        }),
      );

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await runAttempt(environment.fetch, body, signal);
        if (attempt === 1 || !isRetryEligible(result)) return result;

        const continued = await waitForRetry(
          retryDelay(environment.random ?? Math.random),
          signal,
        );
        if (!continued) return { ok: false, reason: "aborted" };
      }

      return { ok: false, reason: "invalid-response" };
    },
  });
}

function retryDelay(random: () => number): number {
  const sampled = random();
  const value = Number.isFinite(sampled)
    ? Math.min(1 - Number.EPSILON, Math.max(0, sampled))
    : 0;
  return (
    MIN_RETRY_DELAY_MS +
    Math.floor(value * (MAX_RETRY_DELAY_MS - MIN_RETRY_DELAY_MS + 1))
  );
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    let completed = false;
    const finish = (continued: boolean) => {
      if (completed) return;
      completed = true;
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      resolve(continued);
    };
    const abort = () => finish(false);
    const timer = window.setTimeout(() => finish(true), delayMs);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function runAttempt(
  fetchRequest: typeof fetch,
  body: string,
  externalSignal?: AbortSignal,
): Promise<MarketingWithdrawalClientResult> {
  if (externalSignal?.aborted)
    return Promise.resolve({ ok: false, reason: "aborted" });

  const controller = new AbortController();
  let interrupt!: (result: MarketingWithdrawalClientResult) => void;
  const interrupted = new Promise<MarketingWithdrawalClientResult>(
    (resolve) => {
      interrupt = resolve;
    },
  );
  const abort = () => {
    interrupt({ ok: false, reason: "aborted" });
    controller.abort();
  };
  externalSignal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(() => {
    interrupt({ ok: false, reason: "timeout" });
    controller.abort();
  }, TIMEOUT_MS);

  return Promise.race([
    request(fetchRequest, body, controller.signal),
    interrupted,
  ]).finally(() => {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abort);
    controller.abort();
  });
}

async function request(
  fetchRequest: typeof fetch,
  body: string,
  signal: AbortSignal,
): Promise<MarketingWithdrawalClientResult> {
  let response: Response;
  try {
    response = await fetchRequest(MARKETING_CONSENT_WITHDRAWAL_PATH, {
      method: "POST",
      credentials: "omit",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body,
      signal,
    });
  } catch {
    return { ok: false, reason: signal.aborted ? "aborted" : "network" };
  }

  const invalid = { ok: false, reason: "invalid-response" } as const;
  if (
    signal.aborted ||
    response.redirected ||
    response.headers.get("Content-Type") !== JSON_MEDIA_TYPE
  )
    return invalid;

  try {
    const text = await readBoundedBody(response, signal);
    if (text === null) return invalid;
    const parsed = marketingConsentResponseSchema.safeParse(JSON.parse(text));
    if (!parsed.success || !isAllowedResponse(response.status, parsed.data))
      return invalid;
    return { ok: true, response: parsed.data };
  } catch {
    return invalid;
  }
}

function isAllowedResponse(
  status: number,
  response: MarketingConsentResponse,
): response is MarketingWithdrawalResponse {
  return [
    "200:withdrawn",
    "200:already_withdrawn",
    "200:not_active",
    "400:invalid_request",
    "400:version_unsupported",
    "409:verification_authority_invalid",
    "503:service_unavailable",
  ].includes(`${status}:${response.result}`);
}

function isRetryEligible(result: MarketingWithdrawalClientResult): boolean {
  return result.ok
    ? result.response.result === "service_unavailable"
    : result.reason === "network" || result.reason === "timeout";
}

async function readBoundedBody(
  response: Response,
  signal: AbortSignal,
): Promise<string | null> {
  const length = response.headers.get("Content-Length");
  if (
    length !== null &&
    (!/^\d+$/.test(length) || Number(length) > MARKETING_CONSENT_MAX_BODY_BYTES)
  )
    return null;
  if (response.body === null) return null;

  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      if (signal.aborted) return null;
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MARKETING_CONSENT_MAX_BODY_BYTES) {
        cancel();
        return null;
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
