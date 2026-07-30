import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BottomSheetTabs } from "./BottomSheetTabs";
import type { MobilePanel } from "./mobile-panel.types";

afterEach(cleanup);

describe("BottomSheetTabs", () => {
  it("exposes standard tab semantics and click selection", async () => {
    const onChange = vi.fn();
    const view = render(
      <BottomSheetTabs activePanel="colors" onChange={onChange} />,
    );

    expect(
      view.getByRole("tablist", { name: "Pattern panels" }),
    ).toBeInTheDocument();
    expect(view.getByRole("tab", { name: "Colors" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(view.getByRole("tab", { name: "Settings" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await userEvent.click(view.getByRole("tab", { name: "Boards" }));
    expect(onChange).toHaveBeenCalledWith("boards");
  });

  it.each([
    ["ArrowRight", "colors"],
    ["ArrowLeft", "original"],
    ["Home", "settings"],
    ["End", "original"],
  ] as const)("supports %s keyboard navigation", async (key, expected) => {
    let active: MobilePanel = "settings";
    const onChange = vi.fn((panel: MobilePanel) => {
      active = panel;
    });
    const view = render(
      <BottomSheetTabs activePanel={active} onChange={onChange} />,
    );

    await userEvent.type(
      view.getByRole("tab", { name: "Settings" }),
      `{${key}}`,
    );
    expect(onChange).toHaveBeenLastCalledWith(expected);
  });
});
