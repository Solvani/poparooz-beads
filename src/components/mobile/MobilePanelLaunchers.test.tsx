import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobilePanelLaunchers } from "./MobilePanelLaunchers";

afterEach(cleanup);

describe("MobilePanelLaunchers", () => {
  it("renders only recovery panels after inline result details", async () => {
    const onOpen = vi.fn();
    const view = render(<MobilePanelLaunchers onOpen={onOpen} />);
    const buttons = view.getAllByRole("button");

    expect(
      buttons.map((button) => button.textContent?.replace("›", "")),
    ).toEqual(["Settings", "Original"]);
    await userEvent.click(buttons[1]!);
    expect(onOpen).toHaveBeenCalledWith("original", buttons[1]);
    expect(view.queryByRole("tab")).toBeNull();
  });
});
