import { useEffect } from "react";

import { appEnvironment } from "../../config/env";

export const GENERATOR_EMBED_PROTOCOL_VERSION = 1 as const;
export const MIN_EMBED_HEIGHT = 320;
export const MAX_EMBED_HEIGHT = 8192;

interface ResizeObserverLike {
  observe(target: Element): void;
  disconnect(): void;
}

export interface GeneratorEmbedBridgeEnvironment {
  readonly window: Window;
  readonly document: Document;
  readonly createResizeObserver: (
    callback: ResizeObserverCallback,
  ) => ResizeObserverLike | null;
  readonly requestFrame: (callback: FrameRequestCallback) => number;
  readonly cancelFrame: (handle: number) => void;
}

export interface StartGeneratorEmbedBridgeOptions {
  readonly allowedParentOrigins: readonly string[];
  readonly environment?: GeneratorEmbedBridgeEnvironment;
}

type GeneratorReadyMessage = Readonly<{
  source: "poparooz-generator";
  version: typeof GENERATOR_EMBED_PROTOCOL_VERSION;
  type: "generator.ready";
  payload: Readonly<Record<string, never>>;
}>;

type GeneratorResizeMessage = Readonly<{
  source: "poparooz-generator";
  version: typeof GENERATOR_EMBED_PROTOCOL_VERSION;
  type: "generator.resize";
  payload: Readonly<{ height: number }>;
}>;

const READY_MESSAGE: GeneratorReadyMessage = Object.freeze({
  source: "poparooz-generator",
  version: GENERATOR_EMBED_PROTOCOL_VERSION,
  type: "generator.ready",
  payload: Object.freeze({}),
});

export function startGeneratorEmbedBridge({
  allowedParentOrigins,
  environment = createBrowserEnvironment(),
}: StartGeneratorEmbedBridgeOptions): () => void {
  const parentOrigin = selectParentOrigin(
    allowedParentOrigins,
    environment.document.referrer,
  );
  if (
    parentOrigin === undefined ||
    environment.window.parent === environment.window
  ) {
    return () => undefined;
  }

  const parentWindow = environment.window.parent;
  const documentElement = environment.document.documentElement;
  let frameHandle: number | undefined;
  let lastHeight: number | undefined;

  const post = (message: GeneratorReadyMessage | GeneratorResizeMessage) => {
    parentWindow.postMessage(message, parentOrigin);
  };
  const measureAndPost = () => {
    frameHandle = undefined;
    const body = environment.document.body;
    const measuredHeight = Math.max(
      documentElement.scrollHeight,
      documentElement.offsetHeight,
      documentElement.clientHeight,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
    );
    const height = clampEmbedHeight(measuredHeight);
    if (height === lastHeight) return;

    lastHeight = height;
    post(
      Object.freeze({
        source: "poparooz-generator",
        version: GENERATOR_EMBED_PROTOCOL_VERSION,
        type: "generator.resize",
        payload: Object.freeze({ height }),
      }),
    );
  };
  const scheduleMeasure = () => {
    if (frameHandle !== undefined) return;
    frameHandle = environment.requestFrame(measureAndPost);
  };

  post(READY_MESSAGE);
  scheduleMeasure();
  const observer = environment.createResizeObserver(scheduleMeasure);
  observer?.observe(documentElement);
  observer?.observe(environment.document.body);
  environment.window.addEventListener("resize", scheduleMeasure);

  return () => {
    observer?.disconnect();
    environment.window.removeEventListener("resize", scheduleMeasure);
    if (frameHandle !== undefined) {
      environment.cancelFrame(frameHandle);
      frameHandle = undefined;
    }
  };
}

export function useGeneratorEmbedBridge(): void {
  useEffect(
    () =>
      startGeneratorEmbedBridge({
        allowedParentOrigins: appEnvironment.allowedParentOrigins,
      }),
    [],
  );
}

function selectParentOrigin(
  allowedParentOrigins: readonly string[],
  referrer: string,
): string | undefined {
  if (allowedParentOrigins.length === 0) return undefined;

  if (referrer !== "") {
    try {
      const referrerOrigin = new URL(referrer).origin;
      return allowedParentOrigins.includes(referrerOrigin)
        ? referrerOrigin
        : undefined;
    } catch {
      return undefined;
    }
  }

  return allowedParentOrigins.length === 1
    ? allowedParentOrigins[0]
    : undefined;
}

function clampEmbedHeight(value: number): number {
  const integerHeight = Number.isFinite(value) ? Math.ceil(value) : 0;
  return Math.min(MAX_EMBED_HEIGHT, Math.max(MIN_EMBED_HEIGHT, integerHeight));
}

function createBrowserEnvironment(): GeneratorEmbedBridgeEnvironment {
  return {
    window,
    document,
    createResizeObserver: (callback) =>
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(callback),
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (handle) => window.cancelAnimationFrame(handle),
  };
}
