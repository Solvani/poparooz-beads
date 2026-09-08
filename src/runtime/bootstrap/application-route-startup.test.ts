import { describe, expect, it, vi } from "vitest";

import { startApplicationRoute } from "./application-route-startup";

describe("application route startup", () => {
  it.each(["/unsubscribe", "/unsubscribe/"])(
    "renders withdrawal without starting Generator for %s",
    (pathname) => {
      const startGenerator = vi.fn();
      const renderMarketingWithdrawal = vi.fn();

      const route = startApplicationRoute({
        pathname,
        startGenerator,
        renderMarketingWithdrawal,
      });

      expect(route).toBe("marketing-withdrawal");
      expect(renderMarketingWithdrawal).toHaveBeenCalledOnce();
      expect(startGenerator).not.toHaveBeenCalled();
    },
  );

  it("preserves Generator startup for every ordinary path", () => {
    const startGenerator = vi.fn();
    const renderMarketingWithdrawal = vi.fn();

    const route = startApplicationRoute({
      pathname: "/patterns?unsubscribe=1",
      startGenerator,
      renderMarketingWithdrawal,
    });

    expect(route).toBe("generator");
    expect(startGenerator).toHaveBeenCalledOnce();
    expect(renderMarketingWithdrawal).not.toHaveBeenCalled();
  });
});
