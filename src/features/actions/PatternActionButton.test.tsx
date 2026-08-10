import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PatternActionButton } from "./PatternActionButton";

afterEach(cleanup);

describe("PatternActionButton", () => {
  it("renders a native disabled action with readable adjacent status", async () => {
    const view = render(
      <PatternActionButton
        enabled={false}
        label="Download Pattern"
        note="Coming later"
        variant="secondary"
      />,
    );
    const button = view.getByRole("button", { name: "Download Pattern" });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("button--secondary");
    expect(view.getByText("Coming later")).toBeInTheDocument();
    expect(view.container.querySelector("a")).toBeNull();
    await userEvent.click(button);
    expect(button).toBeDisabled();
  });
});
