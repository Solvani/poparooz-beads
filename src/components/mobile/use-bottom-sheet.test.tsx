import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { useBottomSheet } from "./use-bottom-sheet";

afterEach(cleanup);

describe("useBottomSheet", () => {
  it("opens the requested panel and restores focus after close", async () => {
    function Harness() {
      const sheet = useBottomSheet();
      return (
        <div>
          <button
            type="button"
            onClick={(event) => sheet.open("boards", event.currentTarget)}
          >
            Open boards
          </button>
          <button type="button" onClick={sheet.close}>
            Close sheet
          </button>
          <output>{sheet.activePanel ?? "closed"}</output>
        </div>
      );
    }

    const view = render(<Harness />);
    const opener = view.getByRole("button", { name: "Open boards" });
    await userEvent.click(opener);
    expect(view.getByText("boards")).toBeInTheDocument();
    await userEvent.click(view.getByRole("button", { name: "Close sheet" }));
    expect(view.getByText("closed")).toBeInTheDocument();
    await new Promise(requestAnimationFrame);
    expect(opener).toHaveFocus();
  });
});
