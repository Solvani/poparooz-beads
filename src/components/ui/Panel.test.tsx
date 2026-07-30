import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Panel } from "./Panel";

describe("Panel", () => {
  it("associates a section with its visible heading", () => {
    render(
      <Panel title="Create" titleId="create-title" eyebrow="Start here">
        Panel content
      </Panel>,
    );

    expect(screen.getByRole("region", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByText("Start here")).toBeInTheDocument();
  });

  it("can use complementary aside semantics", () => {
    render(
      <Panel as="aside" title="Summary" titleId="summary-title">
        Summary content
      </Panel>,
    );

    expect(
      screen.getByRole("complementary", { name: "Summary" }),
    ).toBeInTheDocument();
  });
});
