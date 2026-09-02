import type { EmailGateIssueProofProvider } from "./email-gate-capability";

export const EMAIL_GATE_TURNSTILE_SITEKEY = "0x4AAAAAAEclHlDgEvOVo8_r" as const;
export const EMAIL_GATE_TURNSTILE_ACTION = "email_gate_issue_v1" as const;
export const EMAIL_GATE_TURNSTILE_CONTAINER_ID =
  "email-gate-turnstile" as const;
export const TURNSTILE_EXPLICIT_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" as const;

const TURNSTILE_SCRIPT_LOAD_TIMEOUT_MS = 10_000;
const TURNSTILE_SCRIPT_MARKER = "data-poparooz-turnstile-api";
const MAX_RETRYABLE_TURNSTILE_ERRORS = 2;
const RETRYABLE_TURNSTILE_ERROR_CODES = new Set(["110600", "110620", "200500"]);

interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly action: string;
  readonly execution: "execute";
  readonly appearance: TurnstileAppearance;
  readonly tabindex: 0;
  readonly retry: "auto";
  readonly "response-field": false;
  readonly callback: (token: string) => void;
  readonly "expired-callback": () => void;
  readonly "error-callback": (errorCode: unknown) => boolean;
  readonly "timeout-callback": () => void;
  readonly "before-interactive-callback": () => void;
  readonly "after-interactive-callback": () => void;
}

interface TurnstileBrowserApi {
  render(
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ): string | undefined;
  execute(widgetId: string): void;
  remove(widgetId: string): void;
}

export interface TurnstileIssueProofEnvironment {
  readonly window: Window;
  readonly document: Document;
  readonly setTimeout: (handler: () => void, timeoutMs: number) => number;
  readonly clearTimeout: (timeoutId: number) => void;
  readonly getContainer: () => HTMLElement | null;
}

export type TurnstileAppearance = "always" | "execute" | "interaction-only";

export interface TurnstileIssueProofProviderConfiguration {
  readonly sitekey: string;
  readonly action: string;
  readonly appearance: TurnstileAppearance;
  readonly tabindex: 0;
}

const scriptLoaders = new WeakMap<
  HTMLScriptElement,
  Promise<TurnstileBrowserApi>
>();

export function createTurnstileIssueProofProvider(
  configuration: TurnstileIssueProofProviderConfiguration,
  environment: TurnstileIssueProofEnvironment = browserEnvironment(),
): EmailGateIssueProofProvider {
  const renderConfiguration = Object.freeze({ ...configuration });
  let cancelActiveProof: (() => void) | null = null;
  let interactionActive = false;
  const interactionSubscribers = new Set<() => void>();

  const setInteractionActive = (next: boolean) => {
    if (interactionActive === next) return;
    interactionActive = next;
    interactionSubscribers.forEach((listener) => listener());
  };

  const interaction = Object.freeze({
    isActive: () => interactionActive,
    subscribe: (listener: () => void) => {
      interactionSubscribers.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        interactionSubscribers.delete(listener);
      };
    },
  });

  return Object.freeze({
    interaction,
    getFreshIssueToken(signal: AbortSignal): Promise<string> {
      cancelActiveProof?.();

      return new Promise<string>((resolve, reject) => {
        let api: TurnstileBrowserApi | null = null;
        let widgetId: string | null = null;
        let settled = false;
        let retryableErrorCount = 0;

        const ownsOperation = () => cancelActiveProof === cancel;
        const setInteractionActiveForCurrentOperation = (active: boolean) => {
          if (!settled && ownsOperation()) setInteractionActive(active);
        };

        const cleanup = () => {
          signal.removeEventListener("abort", cancel);
          if (api !== null && widgetId !== null) {
            try {
              api.remove(widgetId);
            } catch {
              // The proof remains failed even if the third-party cleanup throws.
            }
          }
          environment.getContainer()?.replaceChildren();
          if (ownsOperation()) {
            setInteractionActive(false);
            cancelActiveProof = null;
          }
        };
        const fail = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error("Email Gate proof is unavailable."));
        };
        const succeed = (token: string) => {
          if (settled) return;
          if (token.length < 1 || token.length > 2_048) {
            fail();
            return;
          }
          settled = true;
          cleanup();
          resolve(token);
        };
        const cancel = () => fail();
        const handleError = (errorCode: unknown) => {
          if (
            isRetryableTurnstileErrorCode(errorCode) &&
            retryableErrorCount < MAX_RETRYABLE_TURNSTILE_ERRORS
          ) {
            retryableErrorCount += 1;
            return false;
          }
          fail();
          return true;
        };

        cancelActiveProof = cancel;
        if (signal.aborted) {
          cancel();
          return;
        }
        signal.addEventListener("abort", cancel, { once: true });

        void (async () => {
          try {
            api = await waitForAbortable(
              loadTurnstileBrowserApi(environment),
              signal,
            );
            if (settled || signal.aborted) {
              cancel();
              return;
            }
            const container = environment.getContainer();
            if (container === null) {
              fail();
              return;
            }
            container.replaceChildren();
            const renderedWidgetId = api.render(container, {
              sitekey: renderConfiguration.sitekey,
              action: renderConfiguration.action,
              execution: "execute",
              appearance: renderConfiguration.appearance,
              tabindex: renderConfiguration.tabindex,
              retry: "auto",
              "response-field": false,
              callback: succeed,
              "expired-callback": fail,
              "error-callback": handleError,
              "timeout-callback": fail,
              "before-interactive-callback": () =>
                setInteractionActiveForCurrentOperation(true),
              "after-interactive-callback": () =>
                setInteractionActiveForCurrentOperation(false),
            });
            if (typeof renderedWidgetId !== "string") {
              fail();
              return;
            }
            widgetId = renderedWidgetId;
            if (settled) {
              try {
                api.remove(renderedWidgetId);
              } catch {
                // The proof is already settled; cleanup remains best-effort.
              }
              container.replaceChildren();
              return;
            }
            api.execute(renderedWidgetId);
          } catch {
            fail();
          }
        })();
      });
    },
  });
}

function isRetryableTurnstileErrorCode(errorCode: unknown): boolean {
  const normalizedCode =
    typeof errorCode === "string"
      ? errorCode
      : typeof errorCode === "number" &&
          Number.isInteger(errorCode) &&
          errorCode >= 100_000 &&
          errorCode <= 999_999
        ? String(errorCode)
        : null;
  if (normalizedCode === null || !/^\d{6}$/.test(normalizedCode)) return false;
  return (
    RETRYABLE_TURNSTILE_ERROR_CODES.has(normalizedCode) ||
    normalizedCode.startsWith("300") ||
    normalizedCode.startsWith("600")
  );
}

function browserEnvironment(): TurnstileIssueProofEnvironment {
  return Object.freeze({
    window,
    document,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    getContainer: () =>
      document.getElementById(EMAIL_GATE_TURNSTILE_CONTAINER_ID),
  });
}

function loadTurnstileBrowserApi(
  environment: TurnstileIssueProofEnvironment,
): Promise<TurnstileBrowserApi> {
  const readyApi = readTurnstileBrowserApi(environment.window);
  if (readyApi !== null) return Promise.resolve(readyApi);

  const existingScript = Array.from(
    environment.document.querySelectorAll<HTMLScriptElement>("script[src]"),
  ).find((candidate) => candidate.src === TURNSTILE_EXPLICIT_SCRIPT_URL);
  const script = existingScript ?? environment.document.createElement("script");
  const existingLoader = scriptLoaders.get(script);
  if (existingLoader !== undefined) return existingLoader;

  const ownsScript = existingScript === undefined;
  if (ownsScript) {
    script.src = TURNSTILE_EXPLICIT_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.setAttribute(TURNSTILE_SCRIPT_MARKER, "true");
  }

  const loader = new Promise<TurnstileBrowserApi>((resolve, reject) => {
    let settled = false;
    const timeoutId = environment.setTimeout(
      () => finishFailure(),
      TURNSTILE_SCRIPT_LOAD_TIMEOUT_MS,
    );
    const clearListeners = () => {
      environment.clearTimeout(timeoutId);
      script.removeEventListener("load", finishSuccess);
      script.removeEventListener("error", finishFailure);
    };
    const finishSuccess = () => {
      if (settled) return;
      const api = readTurnstileBrowserApi(environment.window);
      if (api === null) {
        finishFailure();
        return;
      }
      settled = true;
      clearListeners();
      resolve(api);
    };
    const finishFailure = () => {
      if (settled) return;
      settled = true;
      clearListeners();
      scriptLoaders.delete(script);
      if (script.getAttribute(TURNSTILE_SCRIPT_MARKER) === "true") {
        script.remove();
      }
      reject(new Error("Turnstile script failed to load."));
    };

    script.addEventListener("load", finishSuccess, { once: true });
    script.addEventListener("error", finishFailure, { once: true });
    if (ownsScript) environment.document.head.append(script);
  });
  scriptLoaders.set(script, loader);
  return loader;
}

function readTurnstileBrowserApi(target: Window): TurnstileBrowserApi | null {
  const candidate: unknown = Reflect.get(target, "turnstile");
  if (typeof candidate !== "object" || candidate === null) return null;
  return typeof Reflect.get(candidate, "render") === "function" &&
    typeof Reflect.get(candidate, "execute") === "function" &&
    typeof Reflect.get(candidate, "remove") === "function"
    ? (candidate as TurnstileBrowserApi)
    : null;
}

function waitForAbortable<T>(promise: Promise<T>, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Email Gate proof was cancelled."));
      return;
    }
    const onAbort = () => reject(new Error("Email Gate proof was cancelled."));
    signal.addEventListener("abort", onAbort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(
          error instanceof Error ? error : new Error("Proof unavailable."),
        );
      },
    );
  });
}
