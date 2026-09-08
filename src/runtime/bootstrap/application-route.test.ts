import { describe, expect, it } from "vitest";

import { resolveApplicationRoute } from "./application-route";

describe("application route resolver", () => {
  it.each(["/unsubscribe", "/unsubscribe/"])(
    "classifies %s as the Marketing withdrawal route",
    (pathname) => {
      expect(resolveApplicationRoute(pathname)).toBe("marketing-withdrawal");
    },
  );

  it.each(["/", "/patterns", "/UNSUBSCRIBE", "/unsubscribe/more"])(
    "keeps %s on the Generator route",
    (pathname) => {
      expect(resolveApplicationRoute(pathname)).toBe("generator");
    },
  );

  it("uses only URL pathname rather than query parameters", () => {
    expect(
      resolveApplicationRoute(
        new URL("https://generator.poparooz.com/?unsubscribe=1").pathname,
      ),
    ).toBe("generator");
    expect(
      resolveApplicationRoute(
        new URL(
          "https://generator.poparooz.com/unsubscribe?destination=generator",
        ).pathname,
      ),
    ).toBe("marketing-withdrawal");
  });
});
