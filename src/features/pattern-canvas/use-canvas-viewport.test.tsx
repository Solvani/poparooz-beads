import { StrictMode, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  CanvasFrameScheduler,
  CanvasResizeObserverFactory,
} from "./pattern-canvas.types";
import { useCanvasViewport } from "./use-canvas-viewport";

function controlledFrames() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const scheduler: CanvasFrameScheduler = {
    request: vi.fn((callback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    }),
    cancel: vi.fn((id) => void callbacks.delete(id)),
  };
  const flush = () => {
    const pending = [...callbacks.entries()];
    callbacks.clear();
    for (const [, callback] of pending) callback(0);
  };
  return { scheduler, callbacks, flush };
}

function observerFactory() {
  let callback: ResizeObserverCallback | undefined;
  const observer = { observe: vi.fn(), disconnect: vi.fn() };
  const create: CanvasResizeObserverFactory = vi.fn((nextCallback) => {
    callback = nextCallback;
    return observer;
  });
  return {
    create,
    observer,
    notify: () => callback?.([], {} as ResizeObserver),
  };
}

function measuredElement(width = 500, height = 400) {
  const element = document.createElement("div");
  let size = { width, height };
  vi.spyOn(element, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: size.width,
        bottom: size.height,
        width: size.width,
        height: size.height,
        toJSON: () => ({}),
      }) as DOMRect,
  );
  return {
    element,
    resize: (nextWidth: number, nextHeight: number) =>
      void (size = { width: nextWidth, height: nextHeight }),
  };
}

describe("useCanvasViewport", () => {
  it("fits after measurement and keeps grid changes local to the view", () => {
    const frames = controlledFrames();
    const observers = observerFactory();
    const measured = measuredElement();
    const alternateCreate: CanvasResizeObserverFactory = (callback) =>
      observers.create(callback);
    const { result, rerender } = renderHook(
      ({ revision }) =>
        useCanvasViewport(
          { width: 100, height: 80 },
          {
            scheduler: frames.scheduler,
            createResizeObserver:
              revision === 0 ? observers.create : alternateCreate,
          },
        ),
      { initialProps: { revision: 0 } },
    );
    Object.defineProperty(result.current.containerRef, "current", {
      configurable: true,
      value: measured.element,
    });
    rerender({ revision: 1 });
    act(() => frames.flush());

    expect(result.current.viewport.fitMode).toBe(true);
    expect(result.current.zoomPercentage).toBe(100);
    act(() => result.current.toggleGrid());
    expect(result.current.viewport.gridVisible).toBe(true);
  });

  it("zooms, fits, drags, cancels pointer capture, and pans by wheel", () => {
    const frames = controlledFrames();
    const observers = observerFactory();
    const measured = measuredElement(300, 240);
    const alternateCreate: CanvasResizeObserverFactory = (callback) =>
      observers.create(callback);
    const pattern = { width: 100, height: 100 };
    const { result, rerender } = renderHook(
      ({ revision }) =>
        useCanvasViewport(pattern, {
          scheduler: frames.scheduler,
          createResizeObserver:
            revision === 0 ? observers.create : alternateCreate,
        }),
      { initialProps: { revision: 0 } },
    );
    Object.defineProperty(result.current.containerRef, "current", {
      configurable: true,
      value: measured.element,
    });
    rerender({ revision: 1 });
    act(() => frames.flush());
    act(() => result.current.zoomIn());
    expect(result.current.zoomPercentage).toBe(125);
    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());

    const target = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    };
    act(() =>
      result.current.pointerHandlers.onPointerDown({
        isPrimary: true,
        button: 0,
        pointerId: 4,
        clientX: 100,
        clientY: 100,
        currentTarget: target,
      } as never),
    );
    const before = result.current.viewport.offsetX;
    act(() =>
      result.current.pointerHandlers.onPointerMove({
        pointerId: 4,
        clientX: 80,
        clientY: 90,
      } as never),
    );
    expect(result.current.viewport.offsetX).toBeLessThan(before);
    act(() =>
      result.current.pointerHandlers.onPointerCancel({
        pointerId: 4,
        currentTarget: target,
      } as never),
    );
    expect(target.releasePointerCapture).toHaveBeenCalledWith(4);

    const beforeWheel = result.current.viewport.offsetY;
    const wheelEvent = {
      preventDefault: vi.fn(),
      deltaX: 0,
      deltaY: 20,
    } as unknown as WheelEvent;
    act(() => result.current.wheelHandler(wheelEvent));
    expect(wheelEvent.preventDefault).toHaveBeenCalledOnce();
    expect(result.current.viewport.offsetY).toBeLessThanOrEqual(beforeWheel);
    act(() => result.current.fit());
    expect(result.current.zoomPercentage).toBe(100);
  });

  it("refits in fit mode and preserves manual scale when ResizeObserver fires", () => {
    const frames = controlledFrames();
    const observers = observerFactory();
    const measured = measuredElement();
    const alternateCreate: CanvasResizeObserverFactory = (callback) =>
      observers.create(callback);
    const { result, rerender } = renderHook(
      ({ revision }) =>
        useCanvasViewport(
          { width: 100, height: 80 },
          {
            scheduler: frames.scheduler,
            createResizeObserver:
              revision === 0 ? observers.create : alternateCreate,
          },
        ),
      { initialProps: { revision: 0 } },
    );
    Object.defineProperty(result.current.containerRef, "current", {
      configurable: true,
      value: measured.element,
    });
    rerender({ revision: 1 });
    act(() => frames.flush());
    const firstFit = result.current.viewport.scale;
    measured.resize(700, 500);
    act(() => {
      observers.notify();
      frames.flush();
    });
    expect(result.current.viewport.scale).not.toBe(firstFit);
    act(() => result.current.zoomIn());
    const manualScale = result.current.viewport.scale;
    measured.resize(600, 450);
    act(() => {
      observers.notify();
      frames.flush();
    });
    expect(result.current.viewport.scale).toBe(manualScale);
  });

  it("disconnects observers and cancels pending frames on StrictMode unmount", () => {
    const frames = controlledFrames();
    const observers = observerFactory();
    const measured = measuredElement();
    const alternateCreate: CanvasResizeObserverFactory = (callback) =>
      observers.create(callback);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const { result, rerender, unmount } = renderHook(
      ({ revision }) =>
        useCanvasViewport(
          { width: 20, height: 20 },
          {
            scheduler: frames.scheduler,
            createResizeObserver:
              revision === 0 ? observers.create : alternateCreate,
          },
        ),
      { initialProps: { revision: 0 }, wrapper },
    );
    Object.defineProperty(result.current.containerRef, "current", {
      configurable: true,
      value: measured.element,
    });
    rerender({ revision: 1 });
    const pointerTarget = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    };
    act(() =>
      result.current.pointerHandlers.onPointerDown({
        isPrimary: true,
        button: 0,
        pointerId: 7,
        clientX: 10,
        clientY: 10,
        currentTarget: pointerTarget,
      } as never),
    );
    unmount();
    expect(observers.observer.disconnect).toHaveBeenCalled();
    expect(frames.scheduler.cancel).toHaveBeenCalled();
    expect(pointerTarget.releasePointerCapture).toHaveBeenCalledWith(7);
  });
});
