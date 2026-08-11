import { describe, expect, it, vi } from "vitest";

import {
  MAX_EMBED_HEIGHT,
  MIN_EMBED_HEIGHT,
  startGeneratorEmbedBridge,
  type GeneratorEmbedBridgeEnvironment,
} from "./generator-embed-bridge";

function createHarness(options: {
  readonly referrer?: string;
  readonly height?: number;
}) {
  const parent = { postMessage: vi.fn() };
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  const windowTarget = {
    parent,
    addEventListener,
    removeEventListener,
  } as unknown as Window;
  const documentElement = {
    scrollHeight: options.height ?? 640,
    offsetHeight: options.height ?? 640,
    clientHeight: options.height ?? 640,
  } as HTMLElement;
  const documentTarget = {
    referrer: options.referrer ?? "https://poparooz.com/pages/tool",
    documentElement,
    body: documentElement,
  } as unknown as Document;
  let resizeCallback: ResizeObserverCallback | undefined;
  const observer = {
    observe: vi.fn(),
    disconnect: vi.fn(),
  };
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;
  const environment: GeneratorEmbedBridgeEnvironment = {
    window: windowTarget,
    document: documentTarget,
    createResizeObserver: vi.fn((callback) => {
      resizeCallback = callback;
      return observer;
    }),
    requestFrame: vi.fn((callback) => {
      const handle = nextFrame++;
      frames.set(handle, callback);
      return handle;
    }),
    cancelFrame: vi.fn((handle) => frames.delete(handle)),
  };

  return {
    parent,
    observer,
    environment,
    flushFrame() {
      const entry = frames.entries().next().value as
        [number, FrameRequestCallback] | undefined;
      if (!entry) return;
      frames.delete(entry[0]);
      entry[1](0);
    },
    resize() {
      resizeCallback?.([], {} as ResizeObserver);
    },
    addEventListener,
    removeEventListener,
  };
}

describe("startGeneratorEmbedBridge", () => {
  it("posts only the versioned ready and bounded resize messages", () => {
    const harness = createHarness({ height: 100 });
    startGeneratorEmbedBridge({
      allowedParentOrigins: ["https://poparooz.com"],
      environment: harness.environment,
    });
    harness.flushFrame();

    expect(harness.parent.postMessage).toHaveBeenNthCalledWith(
      1,
      {
        source: "poparooz-generator",
        version: 1,
        type: "generator.ready",
        payload: {},
      },
      "https://poparooz.com",
    );
    expect(harness.observer.observe).toHaveBeenCalledTimes(2);
    expect(harness.parent.postMessage).toHaveBeenNthCalledWith(
      2,
      {
        source: "poparooz-generator",
        version: 1,
        type: "generator.resize",
        payload: { height: MIN_EMBED_HEIGHT },
      },
      "https://poparooz.com",
    );
  });

  it("caps extreme heights and coalesces unchanged resize observations", () => {
    const harness = createHarness({ height: MAX_EMBED_HEIGHT + 1000 });
    startGeneratorEmbedBridge({
      allowedParentOrigins: ["https://poparooz.com"],
      environment: harness.environment,
    });
    harness.flushFrame();
    harness.resize();
    harness.flushFrame();

    expect(harness.parent.postMessage).toHaveBeenCalledTimes(2);
    expect(harness.parent.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ payload: { height: MAX_EMBED_HEIGHT } }),
      "https://poparooz.com",
    );
  });

  it("denies unknown referrer origins and ambiguous origin lists", () => {
    const unknown = createHarness({
      referrer: "https://unknown.example/page",
    });
    const ambiguous = createHarness({ referrer: "" });

    startGeneratorEmbedBridge({
      allowedParentOrigins: ["https://poparooz.com"],
      environment: unknown.environment,
    });
    startGeneratorEmbedBridge({
      allowedParentOrigins: ["https://poparooz.com", "https://preview.example"],
      environment: ambiguous.environment,
    });

    expect(unknown.parent.postMessage).not.toHaveBeenCalled();
    expect(ambiguous.parent.postMessage).not.toHaveBeenCalled();
  });

  it("does nothing when the generator is opened directly", () => {
    const harness = createHarness({});
    Object.defineProperty(harness.environment.window, "parent", {
      configurable: true,
      value: harness.environment.window,
    });

    startGeneratorEmbedBridge({
      allowedParentOrigins: ["https://poparooz.com"],
      environment: harness.environment,
    });

    expect(harness.parent.postMessage).not.toHaveBeenCalled();
    expect(harness.observer.observe).not.toHaveBeenCalled();
  });

  it("cleans up its observer, listener, and pending frame", () => {
    const harness = createHarness({});
    const cleanup = startGeneratorEmbedBridge({
      allowedParentOrigins: ["https://poparooz.com"],
      environment: harness.environment,
    });

    cleanup();

    expect(harness.observer.disconnect).toHaveBeenCalledOnce();
    expect(harness.removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(harness.environment.cancelFrame).toHaveBeenCalledOnce();
  });
});
