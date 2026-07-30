import { StrictMode } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD, BottomSheet } from "./BottomSheet";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.removeAttribute("style");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

function renderSheet(onClose = vi.fn()) {
  const view = render(
    <>
      <main className="app-root">
        <button type="button">Background action</button>
      </main>
      <BottomSheet
        activePanel="colors"
        onPanelChange={() => {}}
        onClose={onClose}
      >
        <button type="button">Last sheet action</button>
      </BottomSheet>
    </>,
  );
  return { view, onClose };
}

describe("BottomSheet", () => {
  it("uses a body portal and modal dialog semantics", () => {
    const { view } = renderSheet();
    const dialog = view.getByRole("dialog", { name: "Colors" });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.closest(".app-root")).toBeNull();
    expect(document.body.contains(dialog)).toBe(true);
    expect(view.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      "bottom-sheet-tab-colors",
    );
  });

  it("moves focus inside, traps Tab in both directions, and supports Escape", () => {
    const { view, onClose } = renderSheet();
    const close = view.getByRole("button", { name: "Close" });
    const last = view.getByRole("button", { name: "Last sheet action" });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("isolates the background, locks scrolling, and restores exact prior state", () => {
    document.body.style.margin = "3px";
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 137,
    });
    const { view } = renderSheet();
    const background = view.container.querySelector(".app-root")!;

    expect(background).toHaveAttribute("inert");
    expect(background).toHaveAttribute("aria-hidden", "true");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.top).toBe("-137px");
    expect(
      view.getByRole("tabpanel").closest(".bottom-sheet__content"),
    ).toBeTruthy();

    view.unmount();
    expect(background).not.toHaveAttribute("inert");
    expect(background).not.toHaveAttribute("aria-hidden");
    expect(document.body.style.margin).toBe("3px");
    expect(document.body.style.position).toBe("");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 137);
  });

  it("restores background and body state after StrictMode teardown", () => {
    document.body.style.color = "rgb(1, 2, 3)";
    const view = render(
      <StrictMode>
        <>
          <main className="app-root" aria-hidden="false" inert>
            Background
          </main>
          <BottomSheet
            activePanel="settings"
            onPanelChange={() => {}}
            onClose={() => {}}
          >
            Settings content
          </BottomSheet>
        </>
      </StrictMode>,
    );
    const background = view.container.querySelector(".app-root")!;

    view.unmount();
    expect(background).toHaveAttribute("inert");
    expect(background).toHaveAttribute("aria-hidden", "false");
    expect(document.body.style.color).toBe("rgb(1, 2, 3)");
    expect(document.body.style.position).toBe("");
  });

  it("closes only for a complete backdrop click, not sheet content", async () => {
    const { view, onClose } = renderSheet();
    const backdrop = document.querySelector(".bottom-sheet-backdrop")!;
    const content = view.getByRole("tabpanel");

    await userEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(content, { pointerId: 1 });
    fireEvent.pointerUp(backdrop, { pointerId: 1 });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(backdrop, { pointerId: 2 });
    fireEvent.pointerUp(backdrop, { pointerId: 2 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("supports visible close and drag threshold while cancel resets feedback", async () => {
    const { view, onClose } = renderSheet();
    await userEvent.click(view.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const handle = view.getByText("Drag down to close").parentElement!;
    Object.defineProperties(handle, {
      setPointerCapture: { value: vi.fn() },
      releasePointerCapture: { value: vi.fn() },
    });
    fireEvent.pointerDown(handle, {
      pointerId: 3,
      clientY: 10,
      button: 0,
      isPrimary: true,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 3,
      clientY: 10 + BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD - 1,
      isPrimary: true,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 3,
      clientY: 10 + BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD - 1,
      isPrimary: true,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(
      document
        .querySelector<HTMLElement>(".bottom-sheet")
        ?.style.getPropertyValue("--sheet-translate-y"),
    ).toBe("");

    fireEvent.pointerDown(handle, {
      pointerId: 4,
      clientY: 10,
      button: 0,
      isPrimary: true,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 4,
      clientY: 120,
      isPrimary: true,
    });
    fireEvent.pointerCancel(handle, { pointerId: 4, isPrimary: true });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(handle, {
      pointerId: 5,
      clientY: 10,
      button: 0,
      isPrimary: true,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 5,
      clientY: 10 + BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD,
      isPrimary: true,
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
