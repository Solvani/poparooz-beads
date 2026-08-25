import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CanvasToolbar } from "./CanvasToolbar";

afterEach(cleanup);

function renderToolbar(
  overrides: Partial<Parameters<typeof CanvasToolbar>[0]> = {},
) {
  const props = {
    viewMode: "color" as const,
    zoomPercentage: 125,
    canZoomIn: true,
    canZoomOut: true,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFit: vi.fn(),
    onReadCodes: vi.fn(),
    onViewModeChange: vi.fn(),
    ...overrides,
  };
  render(<CanvasToolbar {...props} />);
  return props;
}

describe("CanvasToolbar", () => {
  it("keeps exactly the three frozen controls in the primary group", async () => {
    const props = renderToolbar();
    const primary = screen.getByRole("group", {
      name: "Primary pattern controls",
    });
    expect(
      within(primary)
        .getAllByRole("button")
        .map(({ textContent }) => textContent),
    ).toEqual(["Color Preview", "Color Code View", "Fit to Screen"]);
    expect(screen.queryByRole("button", { name: "Grid" })).toBeNull();
    await userEvent.click(
      within(primary).getByRole("button", { name: "Fit to Screen" }),
    );
    expect(props.onFit).toHaveBeenCalledOnce();
  });

  it("reveals zoom controls only from the accessible secondary disclosure", async () => {
    const props = renderToolbar();
    const more = screen.getByRole("button", { name: "More controls" });
    expect(more).toHaveTextContent("More Controls ▾");
    expect(more).toHaveClass("button--secondary");
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Current zoom")).toBeNull();
    expect(screen.queryByRole("button", { name: "Zoom out" })).toBeNull();

    await userEvent.click(more);

    expect(more).toHaveAttribute("aria-expanded", "true");
    const zoomControls = screen.getByRole("group", { name: "Zoom controls" });
    expect(
      within(zoomControls).getByLabelText("Current zoom"),
    ).toHaveTextContent("125%");
    expect(
      within(zoomControls)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Zoom out", "Zoom in"]);
    await userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(props.onZoomOut).toHaveBeenCalledOnce();
    expect(props.onZoomIn).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Read Codes" })).toBeNull();

    await userEvent.click(more);

    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Current zoom")).toBeNull();
  });

  it("switches between pure presentation modes with an announced selection", async () => {
    const props = renderToolbar();
    const color = screen.getByRole("button", { name: "Color Preview" });
    const code = screen.getByRole("button", { name: "Color Code View" });
    expect(color).toHaveAttribute("aria-pressed", "true");
    expect(code).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(code);
    expect(props.onViewModeChange).toHaveBeenCalledWith("code");
  });

  it("offers Read Codes only in the secondary Code View controls", async () => {
    const props = renderToolbar({ viewMode: "code" });
    expect(screen.queryByRole("button", { name: "Read Codes" })).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "More controls" }),
    );
    const zoomControls = screen.getByRole("group", { name: "Zoom controls" });
    expect(
      within(zoomControls).queryByRole("button", { name: "Read Codes" }),
    ).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Read Codes" }));
    expect(props.onReadCodes).toHaveBeenCalledOnce();
  });

  it("uses native disabled controls at zoom boundaries", async () => {
    renderToolbar({ canZoomIn: false, canZoomOut: false });
    await userEvent.click(
      screen.getByRole("button", { name: "More controls" }),
    );
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  });
});
