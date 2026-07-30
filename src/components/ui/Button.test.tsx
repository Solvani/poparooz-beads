import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it.each(["primary", "secondary", "tertiary"] as const)(
    "renders the %s variant as a native button",
    (variant) => {
      const view = render(<Button variant={variant}>Continue</Button>);

      const button = view.getByRole("button", { name: "Continue" });
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveClass(`button--${variant}`);
    },
  );

  it("preserves disabled semantics and standard button attributes", () => {
    const onClick = vi.fn();
    const view = render(
      <Button disabled name="future-action" onClick={onClick}>
        Coming later
      </Button>,
    );

    const button = view.getByRole("button", { name: "Coming later" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("name", "future-action");
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});
