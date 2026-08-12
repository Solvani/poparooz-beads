import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceMode } from "./use-workspace-mode";
import { getWorkspaceMode } from "./workspace-mode";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
});

describe("workspace mode", () => {
  it.each([
    [320, "compact"],
    [767, "compact"],
    [768, "medium"],
    [899, "medium"],
    [900, "medium"],
    [1399, "medium"],
    [1400, "desktop"],
    [1600, "desktop"],
  ] as const)("maps %ipx to %s", (width, expected) => {
    expect(getWorkspaceMode(width)).toBe(expected);
  });

  it("updates from ResizeObserver and disconnects on unmount", () => {
    let resizeCallback!: ResizeObserverCallback;
    const disconnect = vi.fn();
    const observe = vi.fn();
    const createResizeObserver = vi.fn((callback: ResizeObserverCallback) => {
      resizeCallback = callback;
      return { observe, disconnect };
    });

    function Harness() {
      const workspace = useWorkspaceMode({
        createResizeObserver,
        initialWidth: 767,
      });
      return (
        <div ref={workspace.containerRef} data-testid="root">
          {workspace.mode}
        </div>
      );
    }

    const view = render(<Harness />);
    const root = view.getByTestId("root");
    expect(observe).toHaveBeenCalledWith(root);

    act(() =>
      resizeCallback(
        [
          {
            target: root,
            contentRect: { width: 1400 },
          } as unknown as ResizeObserverEntry,
        ],
        {} as ResizeObserver,
      ),
    );
    expect(root).toHaveTextContent("desktop");

    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("uses a window resize fallback and removes its listener", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 600,
    });
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    function Harness() {
      const workspace = useWorkspaceMode({ createResizeObserver: null });
      return <div ref={workspace.containerRef}>{workspace.mode}</div>;
    }

    const view = render(<Harness />);
    expect(view.container).toHaveTextContent("compact");
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
    });
    act(() => window.dispatchEvent(new Event("resize")));
    expect(view.container).toHaveTextContent("medium");
    view.unmount();

    expect(add).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("does not leak observers under StrictMode", () => {
    const disconnect = vi.fn();
    const createResizeObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect,
    }));

    function Harness() {
      const workspace = useWorkspaceMode({ createResizeObserver });
      return <div ref={workspace.containerRef}>{workspace.mode}</div>;
    }

    const view = render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(
      createResizeObserver.mock.calls.length,
    );
  });
});
