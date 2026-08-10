import { cleanup, render, screen } from "@testing-library/react";
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
    gridVisible: false,
    gridNeedsZoom: false,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFit: vi.fn(),
    onReadCodes: vi.fn(),
    onToggleGrid: vi.fn(),
    onViewModeChange: vi.fn(),
    ...overrides,
  };
  render(<CanvasToolbar {...props} />);
  return props;
}

describe("CanvasToolbar", () => {
  it("exposes keyboard-operable zoom and fit controls with a stable percentage", async () => {
    const props = renderToolbar();
    expect(screen.getByLabelText("Current zoom")).toHaveTextContent("125%");
    await userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    await userEvent.click(screen.getByRole("button", { name: "Fit Pattern" }));
    expect(props.onZoomOut).toHaveBeenCalledOnce();
    expect(props.onZoomIn).toHaveBeenCalledOnce();
    expect(props.onFit).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Read Codes" })).toBeNull();
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

  it("offers an explicit readable-code zoom only in Color Code View", async () => {
    const props = renderToolbar({ viewMode: "code" });
    await userEvent.click(screen.getByRole("button", { name: "Read Codes" }));
    expect(props.onReadCodes).toHaveBeenCalledOnce();
  });

  it("uses native disabled controls at zoom boundaries", () => {
    renderToolbar({ canZoomIn: false, canZoomOut: false });
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  });

  it("announces the selected grid state without hiding it below the threshold", async () => {
    const props = renderToolbar({ gridVisible: true, gridNeedsZoom: true });
    const grid = screen.getByRole("button", { name: "Grid" });
    expect(grid).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Zoom in to see the grid.")).toBeInTheDocument();
    await userEvent.click(grid);
    expect(props.onToggleGrid).toHaveBeenCalledOnce();
  });
});
