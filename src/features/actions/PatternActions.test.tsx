import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    expect(view.getByText("Color code pattern · PNG")).toBeInTheDocument();
    expect(
      view.queryByRole("button", { name: "Get Beads for This Pattern" }),
    ).not.toBeInTheDocument();
    expect(view.queryByText("Coming later")).not.toBeInTheDocument();
    expect(view.container.querySelector("a, [role='button']")).toBeNull();
  });

  it("downloads an available result and announces completion", async () => {
    const onDownload = vi.fn().mockResolvedValue({ ok: true });
    const view = render(
      <PatternActions
        state={actionState({
          hasResult: true,
          resultIdentity: 7,
          resultScope: "current-result",
          downloadEnabled: true,
          availabilityMessage: "Download your color code pattern as a PNG.",
        })}
        onDownload={onDownload}
      />,
    );
    await userEvent.click(
      view.getByRole("button", { name: "Download Pattern" }),
    );
    expect(onDownload).toHaveBeenCalledOnce();
    expect(await view.findByRole("status")).toHaveTextContent(
      "Pattern download ready.",
    );
  });

  it("keeps Download Pattern as the only customer action", () => {
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
      view.queryByRole("button", { name: "Get Beads for This Pattern" }),
    ).not.toBeInTheDocument();
    expect(view.getAllByRole("button")).toHaveLength(1);
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
