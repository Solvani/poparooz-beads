import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GeneratorWorkspaceShell } from "./GeneratorWorkspaceShell";

afterEach(cleanup);

describe("GeneratorWorkspaceShell", () => {
  it("renders three accessible workspace regions", () => {
    const view = render(<GeneratorWorkspaceShell />);

    expect(
      view.getByRole("region", { name: "Start with an image" }),
    ).toHaveClass("workspace-shell__settings");
    expect(
      view.getByRole("region", { name: "Your pattern will appear here." }),
    ).toHaveClass("workspace-shell__canvas");
    expect(
      view.getByRole("complementary", {
        name: "Your pattern details will appear here.",
      }),
    ).toHaveClass("workspace-shell__results");
  });

  it("keeps future actions natively disabled", () => {
    const view = render(<GeneratorWorkspaceShell />);

    expect(
      view.getByRole("button", { name: "Download Pattern" }),
    ).toBeDisabled();
    expect(
      view.getByRole("button", { name: "Get Beads for This Pattern" }),
    ).toBeDisabled();
    expect(view.getByText("Coming later")).toBeInTheDocument();
  });
});
