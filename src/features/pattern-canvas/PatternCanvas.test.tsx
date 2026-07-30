import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CanvasFrameScheduler } from "./pattern-canvas.types";
import { PatternCanvas, type PatternCanvasEnvironment } from "./PatternCanvas";
import type { PatternRasterSurfaceFactory } from "./pattern-raster";
import { createPublicPattern } from "./test/pattern-result";

function context() {
  return {
    createImageData: vi.fn((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb",
    })),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

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
    const pending = [...callbacks.values()];
    callbacks.clear();
    for (const callback of pending) callback(0);
  };
  return { scheduler, callbacks, flush };
}

function environment() {
  const rasterContext = context();
  const createRasterSurface: PatternRasterSurfaceFactory = vi.fn(
    (width, height) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return { canvas, context: rasterContext };
    },
  );
  const resizeFrames = controlledFrames();
  const drawFrames = controlledFrames();
  const observer = { observe: vi.fn(), disconnect: vi.fn() };
  const value: PatternCanvasEnvironment = {
    createRasterSurface,
    scheduler: resizeFrames.scheduler,
    drawScheduler: drawFrames.scheduler,
    createResizeObserver: vi.fn(() => observer),
    getDevicePixelRatio: () => 2,
  };
  const flush = () => {
    act(() => resizeFrames.flush());
    act(() => drawFrames.flush());
    act(() => drawFrames.flush());
  };
  return {
    value,
    createRasterSurface,
    resizeFrames,
    drawFrames,
    observer,
    flush,
  };
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 600,
    bottom: 420,
    width: 600,
    height: 420,
    toJSON: () => ({}),
  } as DOMRect);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context(),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PatternCanvas", () => {
  it("renders one accessible Canvas and the complete toolbar", () => {
    const setup = environment();
    render(
      <PatternCanvas
        pattern={createPublicPattern(20, 20, new Uint16Array(400))}
        environment={setup.value}
      />,
    );
    setup.flush();

    expect(
      screen.getByRole("img", {
        name: "Bead pattern preview, 20 columns by 20 rows.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Fit Pattern" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("caches a raster across zoom, pan, and grid changes and invalidates on a new result", async () => {
    const setup = environment();
    const first = createPublicPattern(20, 20, new Uint16Array(400));
    const view = render(
      <PatternCanvas pattern={first} environment={setup.value} />,
    );
    setup.flush();
    expect(setup.createRasterSurface).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    await userEvent.click(screen.getByRole("button", { name: "Grid" }));
    fireEvent.wheel(screen.getByRole("img"), { deltaX: 10, deltaY: 20 });
    expect(setup.createRasterSurface).toHaveBeenCalledOnce();
    expect(setup.drawFrames.callbacks.size).toBeLessThanOrEqual(1);
    setup.flush();

    view.rerender(
      <PatternCanvas
        pattern={createPublicPattern(10, 10, new Uint16Array(100))}
        environment={setup.value}
      />,
    );
    expect(setup.createRasterSurface).toHaveBeenCalledTimes(2);
  });

  it("disconnects ResizeObserver and cancels pending draw frames on unmount", () => {
    const setup = environment();
    const view = render(
      <PatternCanvas
        pattern={createPublicPattern()}
        environment={setup.value}
      />,
    );
    act(() => setup.resizeFrames.flush());
    expect(setup.drawFrames.callbacks.size).toBe(1);
    view.unmount();
    expect(setup.observer.disconnect).toHaveBeenCalled();
    expect(setup.drawFrames.scheduler.cancel).toHaveBeenCalled();
  });

  it("shows a safe view error for invalid public data or an unavailable context", () => {
    const setup = environment();
    const invalid = createPublicPattern(1, 1, [9]);
    const first = render(
      <PatternCanvas pattern={invalid} environment={setup.value} />,
    );
    expect(
      screen.getByText("We couldn’t display this pattern preview."),
    ).toBeInTheDocument();
    first.unmount();

    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const second = environment();
    render(
      <PatternCanvas
        pattern={createPublicPattern()}
        environment={second.value}
      />,
    );
    second.flush();
    expect(
      screen.getByText("We couldn’t display this pattern preview."),
    ).toBeInTheDocument();
  });
});
