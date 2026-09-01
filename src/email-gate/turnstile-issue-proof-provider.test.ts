import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EMAIL_GATE_TURNSTILE_ACTION,
  EMAIL_GATE_TURNSTILE_CONTAINER_ID,
  EMAIL_GATE_TURNSTILE_SITEKEY,
  TURNSTILE_EXPLICIT_SCRIPT_URL,
  createTurnstileIssueProofProvider,
  type TurnstileIssueProofEnvironment,
  type TurnstileIssueProofProviderConfiguration,
} from "./turnstile-issue-proof-provider";

interface CapturedTurnstileOptions {
  readonly sitekey: string;
  readonly action: string;
  readonly execution: string;
  readonly appearance: string;
  readonly tabindex: number;
  readonly retry: string;
  readonly "response-field": boolean;
  readonly callback: (token: string) => void;
  readonly "expired-callback": () => void;
  readonly "error-callback": () => void;
  readonly "timeout-callback": () => void;
  readonly "before-interactive-callback": () => void;
  readonly "after-interactive-callback": () => void;
}

const PRODUCTION_CONFIGURATION = Object.freeze({
  sitekey: EMAIL_GATE_TURNSTILE_SITEKEY,
  action: EMAIL_GATE_TURNSTILE_ACTION,
  appearance: "interaction-only" as const,
  tabindex: 0 as const,
});

function environment(): TurnstileIssueProofEnvironment {
  return {
    window,
    document,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    getContainer: () =>
      document.getElementById(EMAIL_GATE_TURNSTILE_CONTAINER_ID),
  };
}

function createProvider(
  configuration: TurnstileIssueProofProviderConfiguration = PRODUCTION_CONFIGURATION,
  environmentOverride = environment(),
) {
  return createTurnstileIssueProofProvider(configuration, environmentOverride);
}

function installContainer() {
  const container = document.createElement("div");
  container.id = EMAIL_GATE_TURNSTILE_CONTAINER_ID;
  document.body.append(container);
  return container;
}

function installTurnstileApi() {
  const options: CapturedTurnstileOptions[] = [];
  const containers = new Map<string, HTMLElement>();
  let sequence = 0;
  const api = {
    render: vi.fn(
      (container: HTMLElement, renderOptions: CapturedTurnstileOptions) => {
        sequence += 1;
        const widgetId = `widget-${sequence}`;
        options.push(renderOptions);
        containers.set(widgetId, container);
        container.append(document.createElement("div"));
        return widgetId;
      },
    ),
    execute: vi.fn(),
    remove: vi.fn((widgetId: string) => {
      containers.get(widgetId)?.replaceChildren();
      containers.delete(widgetId);
    }),
  };
  Object.defineProperty(window, "turnstile", {
    configurable: true,
    value: api,
  });
  return { api, options };
}

beforeEach(() => {
  document.head
    .querySelectorAll(`script[src="${TURNSTILE_EXPLICIT_SCRIPT_URL}"]`)
    .forEach((script) => script.remove());
  document.body.innerHTML = "";
  Reflect.deleteProperty(window, "turnstile");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "turnstile");
  document.body.innerHTML = "";
});

describe("Turnstile issue proof provider", () => {
  it("lazily loads the exact explicit script once for superseding proof requests", async () => {
    installContainer();
    const provider = createProvider();
    const first = provider.getFreshIssueToken(new AbortController().signal);
    const firstFailure = expect(first).rejects.toThrow("proof is unavailable");
    const second = provider.getFreshIssueToken(new AbortController().signal);

    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      `script[src="${TURNSTILE_EXPLICIT_SCRIPT_URL}"]`,
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.async).toBe(true);
    expect(scripts[0]!.defer).toBe(true);
    await firstFailure;

    const { options } = installTurnstileApi();
    scripts[0]!.dispatchEvent(new Event("load"));
    await vi.waitFor(() => expect(options).toHaveLength(1));
    options[0]!.callback("fresh-token");
    await expect(second).resolves.toBe("fresh-token");
  });

  it("renders the approved sitekey/action without a response field and removes the widget", async () => {
    const container = installContainer();
    const { api, options } = installTurnstileApi();
    const provider = createProvider();

    const token = provider.getFreshIssueToken(new AbortController().signal);
    await vi.waitFor(() => expect(options).toHaveLength(1));
    expect(options[0]).toMatchObject({
      sitekey: EMAIL_GATE_TURNSTILE_SITEKEY,
      action: EMAIL_GATE_TURNSTILE_ACTION,
      execution: "execute",
      appearance: "interaction-only",
      tabindex: 0,
      retry: "never",
      "response-field": false,
    });
    expect(api.execute).toHaveBeenCalledWith("widget-1");

    options[0]!.callback("approved-token");
    await expect(token).resolves.toBe("approved-token");
    expect(api.remove).toHaveBeenCalledWith("widget-1");
    expect(container).toBeEmptyDOMElement();
  });

  it("accepts a constructor-only QA sitekey and appearance without changing production defaults", async () => {
    installContainer();
    const { options } = installTurnstileApi();
    const provider = createProvider({
      sitekey: "qa-sitekey",
      action: EMAIL_GATE_TURNSTILE_ACTION,
      appearance: "always",
      tabindex: 0,
    });

    const proof = provider.getFreshIssueToken(new AbortController().signal);
    await vi.waitFor(() => expect(options).toHaveLength(1));
    expect(options[0]).toMatchObject({
      sitekey: "qa-sitekey",
      action: EMAIL_GATE_TURNSTILE_ACTION,
      appearance: "always",
      tabindex: 0,
    });
    options[0]!.callback("qa-token");
    await expect(proof).resolves.toBe("qa-token");
  });

  it("tracks the supported interactive lifecycle and clears it on success", async () => {
    installContainer();
    const { options } = installTurnstileApi();
    const provider = createProvider();
    const proof = provider.getFreshIssueToken(new AbortController().signal);
    await vi.waitFor(() => expect(options).toHaveLength(1));

    expect(provider.interaction?.isActive()).toBe(false);
    options[0]!["before-interactive-callback"]();
    expect(provider.interaction?.isActive()).toBe(true);
    options[0]!["after-interactive-callback"]();
    expect(provider.interaction?.isActive()).toBe(false);
    options[0]!["before-interactive-callback"]();
    options[0]!.callback("interactive-token");
    await expect(proof).resolves.toBe("interactive-token");
    expect(provider.interaction?.isActive()).toBe(false);
  });

  it("notifies subscribers only for interaction transitions and supports idempotent unsubscribe", async () => {
    installContainer();
    const { options } = installTurnstileApi();
    const provider = createProvider();
    const operation = new AbortController();
    const proof = provider.getFreshIssueToken(operation.signal);
    const snapshots: boolean[] = [];
    const unsubscribe = provider.interaction!.subscribe(() => {
      snapshots.push(provider.interaction!.isActive());
    });
    await vi.waitFor(() => expect(options).toHaveLength(1));

    options[0]!["before-interactive-callback"]();
    options[0]!["before-interactive-callback"]();
    options[0]!["after-interactive-callback"]();
    options[0]!["after-interactive-callback"]();
    expect(snapshots).toEqual([true, false]);

    unsubscribe();
    unsubscribe();
    options[0]!["before-interactive-callback"]();
    expect(provider.interaction!.isActive()).toBe(true);
    expect(snapshots).toEqual([true, false]);

    operation.abort();
    await expect(proof).rejects.toThrow("proof is unavailable");
    expect(provider.interaction!.isActive()).toBe(false);
    expect(snapshots).toEqual([true, false]);
  });

  it("cleans up without executing when rendering settles synchronously", async () => {
    const container = installContainer();
    const api = {
      render: vi.fn(
        (target: HTMLElement, renderOptions: CapturedTurnstileOptions) => {
          target.append(document.createElement("div"));
          renderOptions.callback("synchronous-token");
          return "widget-sync";
        },
      ),
      execute: vi.fn(),
      remove: vi.fn(),
    };
    Object.defineProperty(window, "turnstile", {
      configurable: true,
      value: api,
    });
    const provider = createProvider();

    await expect(
      provider.getFreshIssueToken(new AbortController().signal),
    ).resolves.toBe("synchronous-token");
    expect(api.execute).not.toHaveBeenCalled();
    expect(api.remove).toHaveBeenCalledWith("widget-sync");
    expect(container).toBeEmptyDOMElement();
  });

  it("obtains a new widget and distinct token for every issuance", async () => {
    installContainer();
    const { api, options } = installTurnstileApi();
    const provider = createProvider();

    const first = provider.getFreshIssueToken(new AbortController().signal);
    await vi.waitFor(() => expect(options).toHaveLength(1));
    options[0]!.callback("token-one");
    await expect(first).resolves.toBe("token-one");

    const second = provider.getFreshIssueToken(new AbortController().signal);
    await vi.waitFor(() => expect(options).toHaveLength(2));
    options[1]!.callback("token-two");
    await expect(second).resolves.toBe("token-two");

    expect(api.render).toHaveBeenCalledTimes(2);
    expect(api.execute).toHaveBeenNthCalledWith(1, "widget-1");
    expect(api.execute).toHaveBeenNthCalledWith(2, "widget-2");
    expect(api.remove).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["expiry", "expired-callback"],
    ["widget error", "error-callback"],
    ["challenge timeout", "timeout-callback"],
  ] as const)("fails closed on %s", async (_label, callbackName) => {
    const container = installContainer();
    const { api, options } = installTurnstileApi();
    const provider = createProvider();
    const proof = provider.getFreshIssueToken(new AbortController().signal);
    await vi.waitFor(() => expect(options).toHaveLength(1));

    options[0]!["before-interactive-callback"]();
    expect(provider.interaction?.isActive()).toBe(true);
    options[0]![callbackName]();
    await expect(proof).rejects.toThrow("proof is unavailable");
    expect(provider.interaction?.isActive()).toBe(false);
    expect(api.remove).toHaveBeenCalledWith("widget-1");
    expect(container).toBeEmptyDOMElement();
  });

  it("removes the widget when the dialog operation is aborted", async () => {
    const container = installContainer();
    const { api, options } = installTurnstileApi();
    const provider = createProvider();
    const operation = new AbortController();
    const proof = provider.getFreshIssueToken(operation.signal);
    await vi.waitFor(() => expect(options).toHaveLength(1));

    options[0]!["before-interactive-callback"]();
    expect(provider.interaction?.isActive()).toBe(true);
    operation.abort();
    await expect(proof).rejects.toThrow("proof is unavailable");
    expect(provider.interaction?.isActive()).toBe(false);
    expect(api.remove).toHaveBeenCalledWith("widget-1");
    expect(container).toBeEmptyDOMElement();
  });

  it("supersedes a stale proof operation and ignores its later callback", async () => {
    installContainer();
    const { options } = installTurnstileApi();
    const provider = createProvider();
    const snapshots: boolean[] = [];
    const unsubscribe = provider.interaction!.subscribe(() => {
      snapshots.push(provider.interaction!.isActive());
    });
    const first = provider.getFreshIssueToken(new AbortController().signal);
    await vi.waitFor(() => expect(options).toHaveLength(1));
    const staleCallback = options[0]!.callback;
    const staleBeforeInteractive = options[0]!["before-interactive-callback"];
    const staleAfterInteractive = options[0]!["after-interactive-callback"];
    staleBeforeInteractive();
    expect(provider.interaction?.isActive()).toBe(true);

    const second = provider.getFreshIssueToken(new AbortController().signal);
    await expect(first).rejects.toThrow("proof is unavailable");
    expect(provider.interaction?.isActive()).toBe(false);
    await vi.waitFor(() => expect(options).toHaveLength(2));
    options[1]!["before-interactive-callback"]();
    expect(provider.interaction?.isActive()).toBe(true);
    staleAfterInteractive();
    expect(provider.interaction?.isActive()).toBe(true);
    options[1]!["after-interactive-callback"]();
    expect(provider.interaction?.isActive()).toBe(false);
    staleBeforeInteractive();
    expect(provider.interaction?.isActive()).toBe(false);
    staleCallback("stale-token");
    options[1]!.callback("current-token");
    await expect(second).resolves.toBe("current-token");
    expect(snapshots).toEqual([true, false, true, false]);
    unsubscribe();
  });

  it("removes a failed script and permits a clean later load", async () => {
    installContainer();
    const provider = createProvider();
    const failed = provider.getFreshIssueToken(new AbortController().signal);
    const firstScript = document.head.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_EXPLICIT_SCRIPT_URL}"]`,
    );
    expect(firstScript).not.toBeNull();
    firstScript!.dispatchEvent(new Event("error"));
    await expect(failed).rejects.toThrow("proof is unavailable");
    expect(firstScript).not.toBeInTheDocument();

    const retry = provider.getFreshIssueToken(new AbortController().signal);
    const secondScript = document.head.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_EXPLICIT_SCRIPT_URL}"]`,
    );
    expect(secondScript).not.toBeNull();
    expect(secondScript).not.toBe(firstScript);
    const { options } = installTurnstileApi();
    secondScript!.dispatchEvent(new Event("load"));
    await vi.waitFor(() => expect(options).toHaveLength(1));
    options[0]!.callback("retry-token");
    await expect(retry).resolves.toBe("retry-token");
  });

  it("fails closed and removes its script when script loading times out", async () => {
    installContainer();
    let timeoutHandler: (() => void) | undefined;
    const timedEnvironment: TurnstileIssueProofEnvironment = {
      ...environment(),
      setTimeout: (handler) => {
        timeoutHandler = handler;
        return 1;
      },
      clearTimeout: vi.fn(),
    };
    const provider = createProvider(PRODUCTION_CONFIGURATION, timedEnvironment);
    const proof = provider.getFreshIssueToken(new AbortController().signal);
    const script = document.head.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_EXPLICIT_SCRIPT_URL}"]`,
    );

    expect(script).not.toBeNull();
    expect(timeoutHandler).toEqual(expect.any(Function));
    timeoutHandler!();
    await expect(proof).rejects.toThrow("proof is unavailable");
    expect(script).not.toBeInTheDocument();
  });

  it("fails closed when no mounted dialog container exists", async () => {
    installTurnstileApi();
    const provider = createProvider();
    await expect(
      provider.getFreshIssueToken(new AbortController().signal),
    ).rejects.toThrow("proof is unavailable");
  });
});
