import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GeneratorWorkspaceShell } from "./GeneratorWorkspaceShell";

afterEach(cleanup);

describe("GeneratorWorkspaceShell", () => {
  it("renders the stable desktop three-column shell before generation", () => {
    const view = render(<GeneratorWorkspaceShell />);

    expect(view.getByRole("region", { name: "1. Upload Image" })).toHaveClass(
      "workspace-shell__settings",
    );
    expect(view.getByRole("region", { name: "Pattern Canvas" })).toHaveClass(
      "workspace-shell__canvas",
    );
    expect(
      view.getByRole("complementary", { name: "Results" }),
    ).toHaveTextContent("Your results will appear here");
    expect(
      view.getByRole("complementary", { name: "Results" }),
    ).toHaveTextContent("After you generate a pattern");
    expect(
      view.getByRole("button", { name: "Save / Download Pattern" }),
    ).toBeDisabled();
    expect(view.queryByText("Pattern Size")).toBeNull();
    expect(view.getByRole("main")).toHaveAttribute("data-has-results", "false");
  });

  it("accepts a dedicated actions region without owning action behavior", () => {
    const view = render(
      <GeneratorWorkspaceShell
        actionsContent={<section aria-label="Pattern Options">Actions</section>}
      />,
    );

    expect(
      view.getByRole("region", { name: "Pattern Options" }),
    ).toHaveTextContent("Actions");
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
      view.getByRole("complementary", { name: "Results" }),
    ).toHaveTextContent("Your results will appear here");
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
      view.getByRole("complementary", { name: "Results" }),
    ).toHaveTextContent("Your results will appear here");
  });

  it("replaces result placeholders while retaining supplied actions", () => {
    const view = render(
      <GeneratorWorkspaceShell
        resultsContent={<p>Public result details</p>}
        actionsContent={<p>Stable actions</p>}
      />,
    );
    expect(view.getByText("Public result details")).toBeInTheDocument();
    expect(
      view.getByRole("complementary", { name: "Results" }),
    ).toBeInTheDocument();
    expect(view.getByRole("main")).toHaveClass("workspace-shell--has-results");
    expect(view.getByRole("main")).toHaveAttribute("data-has-results", "true");
    expect(
      view.queryByText("Your pattern details will appear here."),
    ).toBeNull();
    expect(view.getByText("Stable actions")).toBeInTheDocument();
  });

  it("supports compact result-first placement without mounting Settings", () => {
    const view = render(
      <GeneratorWorkspaceShell
        workspaceMode="compact"
        showSettingsRegion={false}
        lifecycleContent={<p>Updating result</p>}
        canvasContent={<p>Pattern Canvas content</p>}
        resultsContent={<p>Compact result content</p>}
      />,
    );

    expect(view.getByRole("main")).toHaveAttribute(
      "data-workspace-mode",
      "compact",
    );
    expect(view.queryByText("1. Upload Image")).toBeNull();
    expect(
      view.getByRole("region", { name: "Pattern status" }),
    ).toHaveTextContent("Updating result");
    expect(view.getByText("Pattern Canvas content")).toBeInTheDocument();
    expect(view.getByText("Compact result content")).toBeInTheDocument();
  });

  it("places Medium generation status inside the full-width Canvas region", () => {
    const view = render(
      <GeneratorWorkspaceShell
        workspaceMode="medium"
        canvasStatusContent={<p>Medium generation status</p>}
        canvasContent={<p>Medium Canvas</p>}
      />,
    );
    const canvas = view.getByRole("region", {
      name: "Pattern Canvas",
    });

    expect(view.getByRole("main")).toHaveAttribute(
      "data-workspace-mode",
      "medium",
    );
    expect(canvas).toHaveTextContent("Medium generation status");
    expect(canvas).toHaveTextContent("Medium Canvas");
    expect(view.queryByRole("complementary")).toBeNull();
  });
});
