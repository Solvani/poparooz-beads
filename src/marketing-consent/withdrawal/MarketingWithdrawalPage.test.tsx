import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketingWithdrawalPage } from "./MarketingWithdrawalPage";
import { resolveMarketingWithdrawalAvailability } from "./marketing-withdrawal-availability";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MarketingWithdrawalPage foundation", () => {
  it.each([false, true])(
    "renders only the unavailable shell when enabled is %s",
    (enabled) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const view = render(
        <MarketingWithdrawalPage
          availability={resolveMarketingWithdrawalAvailability(
            enabled ? "true" : "false",
          )}
        />,
      );

      expect(view.container.firstElementChild).toHaveAttribute(
        "data-feature-state",
        "FEATURE_UNAVAILABLE",
      );
      expect(
        screen.getByRole("heading", {
          name: "Marketing preferences are temporarily unavailable.",
        }),
      ).toBeVisible();
      expect(screen.getByRole("img", { name: "Poparooz" })).toBeVisible();
      expect(
        screen.getByRole("link", { name: /pattern maker/i }),
      ).toHaveAttribute("href", "/");
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      expect(document.body.textContent).not.toMatch(
        /download|verification code/i,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );
});
