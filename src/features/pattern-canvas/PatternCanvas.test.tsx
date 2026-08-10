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
    save: vi.fn(),
    restore: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillText: vi.fn(),
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
  let resizeCallback: ResizeObserverCallback | undefined;
  const value: PatternCanvasEnvironment = {
    createRasterSurface,
    scheduler: resizeFrames.scheduler,
    drawScheduler: drawFrames.scheduler,
    createResizeObserver: vi.fn((callback) => {
      resizeCallback = callback;
      return observer;
    }),
    getDevicePixelRatio: () => 2,
  };
  const flush = () => {
    act(() => resizeFrames.flush());
    act(() => drawFrames.flush());
    act(() => drawFrames.flush());
  };
  const notifyResize = () => {
    act(() => {
      resizeCallback?.([], observer as unknown as ResizeObserver);
      resizeFrames.flush();
    });
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
    notifyResize,
  };
}

let displayContext: CanvasRenderingContext2D;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const width = 600;
      const height = this.classList.contains("pattern-canvas__viewport--code")
        ? width
        : 420;
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
  displayContext = context();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    displayContext,
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
    expect(
      screen.getByRole("button", { name: "Color Preview" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Fit Pattern" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(
      document.querySelector(".pattern-canvas__viewport--code"),
    ).toBeNull();
  });

  it("registers wheel panning as non-passive and removes the listener", () => {
    const addEventListener = vi.spyOn(
      HTMLCanvasElement.prototype,
      "addEventListener",
    );
    const removeEventListener = vi.spyOn(
      HTMLCanvasElement.prototype,
      "removeEventListener",
    );
    const setup = environment();
    const view = render(
      <PatternCanvas
        pattern={createPublicPattern(20, 20, new Uint16Array(400))}
        environment={setup.value}
      />,
    );

    expect(addEventListener).toHaveBeenCalledWith(
      "wheel",
      expect.any(Function),
      { passive: false },
    );
    view.unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "wheel",
      expect.any(Function),
    );
  });

  it("switches views without rebuilding or mutating the pattern", async () => {
    const setup = environment();
    const pattern = createPublicPattern(20, 20, new Uint16Array(400));
    render(<PatternCanvas pattern={pattern} environment={setup.value} />);
    setup.flush();
    await userEvent.click(
      screen.getByRole("button", { name: "Color Code View" }),
    );
    setup.notifyResize();
    expect(setup.createRasterSurface).toHaveBeenCalledOnce();
    expect(displayContext.fillText).toHaveBeenCalledWith(
      "A1",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    expect(
      screen.getByRole("button", { name: "Color Code View" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      document.querySelector(".pattern-canvas__viewport--code"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Poparooz color codes are aligned with their pattern cells.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Color Preview" }),
    );
    setup.flush();
    expect(setup.createRasterSurface).toHaveBeenCalledOnce();
    expect(pattern.matrix.colorIndices).toEqual(new Uint16Array(400));
    expect(
      document.querySelector(".pattern-canvas__viewport--code"),
    ).toBeNull();
  });

  it.each([40, 80, 104])(
    "fits the complete %i-square pattern before offering readable codes",
    async (size) => {
      const setup = environment();
      render(
        <PatternCanvas
          pattern={createPublicPattern(
            size,
            size,
            new Uint16Array(size * size),
          )}
          environment={setup.value}
        />,
      );
      setup.flush();
      expect(screen.getByLabelText("Current zoom")).toHaveTextContent("100%");

      await userEvent.click(
        screen.getByRole("button", { name: "Color Code View" }),
      );
      setup.notifyResize();

      expect(screen.getByLabelText("Current zoom")).toHaveTextContent("100%");
      const canvas = screen.getByRole("img") as HTMLCanvasElement;
      expect(canvas.width).toBe(canvas.height);
      expect(displayContext.drawImage).toHaveBeenLastCalledWith(
        expect.anything(),
        0,
        0,
        size,
        size,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      expect(displayContext.fillText).not.toHaveBeenCalled();
      expect(
        screen.getByText("Zoom in to read color codes."),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Read Codes" }));
      setup.flush();

      expect(screen.getByLabelText("Current zoom")).not.toHaveTextContent(
        "100%",
      );
      expect(displayContext.fillText).toHaveBeenCalledWith(
        "A1",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      expect(
        vi
          .mocked(displayContext.rect)
          .mock.calls.every(([, , width, height]) => width === height),
      ).toBe(true);
      expect(
        screen.getByText(
          "Poparooz color codes are aligned with their pattern cells.",
        ),
      ).toBeInTheDocument();
    },
  );

  it("allows Fit Pattern to return Code View to the low-scale hint", async () => {
    const setup = environment();
    render(
      <PatternCanvas
        pattern={createPublicPattern(104, 104, new Uint16Array(104 * 104))}
        environment={setup.value}
      />,
    );
    setup.flush();
    await userEvent.click(
      screen.getByRole("button", { name: "Color Code View" }),
    );
    setup.notifyResize();
    expect(displayContext.fillText).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Read Codes" }));
    setup.flush();
    expect(displayContext.fillText).toHaveBeenCalled();

    vi.mocked(displayContext.fillText).mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Fit Pattern" }));
    setup.flush();
    expect(displayContext.fillText).not.toHaveBeenCalled();
    const canvas = screen.getByRole("img") as HTMLCanvasElement;
    expect(canvas.width).toBe(canvas.height);
    expect(
      screen.getByText("Zoom in to read color codes."),
    ).toBeInTheDocument();
  });

  it("shows and hides grid lines in Color Code View without hiding codes", async () => {
    const setup = environment();
    render(
      <PatternCanvas
        pattern={createPublicPattern(80, 80, new Uint16Array(80 * 80))}
        environment={setup.value}
      />,
    );
    setup.flush();
    await userEvent.click(
      screen.getByRole("button", { name: "Color Code View" }),
    );
    setup.notifyResize();
    await userEvent.click(screen.getByRole("button", { name: "Read Codes" }));
    setup.flush();

    expect(displayContext.fillText).toHaveBeenCalled();
    expect(displayContext.stroke).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Grid" }));
    setup.flush();
    expect(displayContext.stroke).toHaveBeenCalled();

    vi.mocked(displayContext.stroke).mockClear();
    vi.mocked(displayContext.fillText).mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Grid" }));
    setup.flush();
    expect(displayContext.stroke).not.toHaveBeenCalled();
    expect(displayContext.fillText).toHaveBeenCalled();
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
