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

  it("accepts Settings content and reports only image readiness to the empty Canvas", () => {
    const view = render(
      <GeneratorWorkspaceShell
        imageReady
        settingsContent={<p>Local settings</p>}
      />,
    );

    expect(view.getByText("Local settings")).toBeInTheDocument();
    expect(
      view.getByText(
        "Your image is ready. Generate the pattern in the next step.",
      ),
    ).toBeInTheDocument();
    expect(
      view.getByText("Your pattern details will appear here."),
    ).toBeInTheDocument();
  });

  it("replaces only the Canvas empty state with supplied preview content", () => {
    const view = render(
      <GeneratorWorkspaceShell canvasContent={<p>Public pattern preview</p>} />,
    );
    expect(view.getByText("Public pattern preview")).toBeInTheDocument();
    expect(
      view.queryByText("Upload an image and generate a pattern to begin."),
    ).toBeNull();
    expect(
      view.getByText("Your pattern details will appear here."),
    ).toBeInTheDocument();
  });
});
