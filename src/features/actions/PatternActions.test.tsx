import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PatternActions } from "./PatternActions";
import type { PatternActionState } from "./pattern-action.types";

afterEach(cleanup);

function actionState(
  overrides: Partial<PatternActionState> = {},
): PatternActionState {
  return {
    hasResult: false,
    resultIdentity: null,
    resultScope: "none",
    downloadEnabled: false,
    getBeadsEnabled: false,
    availabilityMessage:
      "Create a pattern to access download and bead options.",
    scopeMessage: null,
    ...overrides,
  };
}

describe("PatternActions", () => {
  it("shows an accessible, stable no-result action region", () => {
    const view = render(<PatternActions state={actionState()} />);

    expect(
      view.getByRole("region", { name: "Pattern Options" }),
    ).toBeInTheDocument();
    expect(
      view.getByText("Create a pattern to access download and bead options."),
    ).toBeInTheDocument();
    expect(
      view.getByRole("button", { name: "Download Pattern" }),
    ).toBeDisabled();
    expect(
      view.getByRole("button", { name: "Get Beads for This Pattern" }),
    ).toBeDisabled();
    expect(view.getAllByText("Coming later")).toHaveLength(2);
    expect(view.container.querySelector("a, [role='button']")).toBeNull();
  });

  it("preserves the future primary and secondary hierarchy", () => {
    const view = render(
      <PatternActions
        state={actionState({
          hasResult: true,
          resultIdentity: 1,
          resultScope: "current-result",
          availabilityMessage:
            "Download and bead options are not available in this preview.",
        })}
      />,
    );

    expect(
      view.getByText(
        "Download and bead options are not available in this preview.",
      ),
    ).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Download Pattern" })).toHaveClass(
      "button--secondary",
    );
    expect(
      view.getByRole("button", { name: "Get Beads for This Pattern" }),
    ).toHaveClass("button--primary");
  });

  it.each([
    "These actions apply to your previous pattern.",
    "Your previous pattern remains available while the update is processing.",
  ])("announces the previous-result scope: %s", (scopeMessage) => {
    const view = render(
      <PatternActions state={actionState({ scopeMessage })} />,
    );

    expect(view.getByRole("status")).toHaveTextContent(scopeMessage);
  });

  it("contains no customer-facing commerce claims or internal fields", () => {
    const { container } = render(<PatternActions state={actionState()} />);
    const visible = container.textContent ?? "";

    for (const forbidden of [
      "Buy Now",
      "Add to Cart",
      "Checkout",
      "Shopify",
      "variantId",
      "shopifyHandle",
      "packSize",
      "price",
      "inventory",
      "referenceCode",
    ]) {
      expect(visible).not.toContain(forbidden);
    }
  });

  it("freezes compact, medium, and desktop layout semantics in CSS", () => {
    const css = readFileSync(
      join(process.cwd(), "src/styles/workspace.css"),
      "utf8",
    );

    expect(css).toMatch(/\.pattern-actions__buttons\s*{\s*display: grid/);
    expect(css).toMatch(/\.pattern-action__button\s*{[^}]*width: 100%/s);
    expect(css).toMatch(/\.pattern-action__button\s*{[^}]*min-height: 48px/s);
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });
});
