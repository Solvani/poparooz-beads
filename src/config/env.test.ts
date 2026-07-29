import { describe, expect, it } from "vitest";

import { EnvironmentConfigurationError, parseEnvironment } from "./env";

describe("parseEnvironment", () => {
  it("allows an unconfigured development environment", () => {
    expect(parseEnvironment({})).toEqual({
      shopUrl: undefined,
      beadsCollectionUrl: undefined,
      generatorPublicUrl: undefined,
      allowedParentOrigins: [],
    });
  });

  it("normalizes configured URLs and comma-separated parent origins", () => {
    expect(
      parseEnvironment({
        VITE_SHOP_URL: "https://www.poparooz.com",
        VITE_BEADS_COLLECTION_URL: "https://www.poparooz.com/collections/beads",
        VITE_GENERATOR_PUBLIC_URL: "https://generator.poparooz.com",
        VITE_ALLOWED_PARENT_ORIGINS:
          "https://www.poparooz.com, http://localhost:5173",
      }),
    ).toEqual({
      shopUrl: "https://www.poparooz.com/",
      beadsCollectionUrl: "https://www.poparooz.com/collections/beads",
      generatorPublicUrl: "https://generator.poparooz.com/",
      allowedParentOrigins: [
        "https://www.poparooz.com",
        "http://localhost:5173",
      ],
    });
  });

  it("rejects non-HTTP application URLs", () => {
    expect(() =>
      parseEnvironment({ VITE_SHOP_URL: "file:///private/shop" }),
    ).toThrow(EnvironmentConfigurationError);
  });

  it("rejects parent values that are not exact origins", () => {
    expect(() =>
      parseEnvironment({
        VITE_ALLOWED_PARENT_ORIGINS: "https://www.poparooz.com/pages/tool",
      }),
    ).toThrow(/must be an origin/);
  });
});
