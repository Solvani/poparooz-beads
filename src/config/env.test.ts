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
        VITE_SHOP_URL: "https://poparooz.com",
        VITE_BEADS_COLLECTION_URL: "https://poparooz.com/collections/beads",
        VITE_GENERATOR_PUBLIC_URL: "https://generator.poparooz.com",
        VITE_ALLOWED_PARENT_ORIGINS:
          "https://poparooz.com, http://localhost:5173",
      }),
    ).toEqual({
      shopUrl: "https://poparooz.com/",
      beadsCollectionUrl: "https://poparooz.com/collections/beads",
      generatorPublicUrl: "https://generator.poparooz.com/",
      allowedParentOrigins: ["https://poparooz.com", "http://localhost:5173"],
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
        VITE_ALLOWED_PARENT_ORIGINS: "https://poparooz.com/pages/tool",
      }),
    ).toThrow(/must be an origin/);
  });

  it("requires complete HTTPS identities in production", () => {
    expect(() =>
      parseEnvironment(
        {
          VITE_SHOP_URL: "http://www.poparooz.com",
          VITE_GENERATOR_PUBLIC_URL: "https://generator.poparooz.com",
          VITE_ALLOWED_PARENT_ORIGINS: "https://poparooz.com",
        },
        { production: true },
      ),
    ).toThrow(/VITE_SHOP_URL.*HTTPS/);

    expect(() =>
      parseEnvironment(
        {
          VITE_SHOP_URL: "https://poparooz.com",
          VITE_GENERATOR_PUBLIC_URL: "http://generator.poparooz.com",
          VITE_ALLOWED_PARENT_ORIGINS: "https://poparooz.com",
        },
        { production: true },
      ),
    ).toThrow(/VITE_GENERATOR_PUBLIC_URL.*HTTPS/);

    expect(() =>
      parseEnvironment(
        {
          VITE_SHOP_URL: "https://poparooz.com",
          VITE_GENERATOR_PUBLIC_URL: "https://generator.poparooz.com",
          VITE_ALLOWED_PARENT_ORIGINS: "http://www.poparooz.com",
        },
        { production: true },
      ),
    ).toThrow(/VITE_ALLOWED_PARENT_ORIGINS.*HTTPS/);

    expect(() =>
      parseEnvironment(
        {
          VITE_SHOP_URL: "https://poparooz.com",
          VITE_GENERATOR_PUBLIC_URL: "https://generator.poparooz.com",
        },
        { production: true },
      ),
    ).toThrow(/VITE_ALLOWED_PARENT_ORIGINS.*exactly one/);
  });

  it("rejects wildcard and mismatched production parent origins", () => {
    expect(() =>
      parseEnvironment(
        {
          VITE_SHOP_URL: "https://poparooz.com",
          VITE_GENERATOR_PUBLIC_URL: "https://generator.poparooz.com",
          VITE_ALLOWED_PARENT_ORIGINS: "*",
        },
        { production: true },
      ),
    ).toThrow(EnvironmentConfigurationError);

    expect(() =>
      parseEnvironment(
        {
          VITE_SHOP_URL: "https://poparooz.com",
          VITE_GENERATOR_PUBLIC_URL: "https://generator.poparooz.com",
          VITE_ALLOWED_PARENT_ORIGINS: "https://unknown.example",
        },
        { production: true },
      ),
    ).toThrow(/approved shop origin/);
  });

  it("accepts the approved production identities", () => {
    expect(
      parseEnvironment(
        {
          VITE_SHOP_URL: "https://poparooz.com",
          VITE_GENERATOR_PUBLIC_URL: "https://generator.poparooz.com",
          VITE_ALLOWED_PARENT_ORIGINS: "https://poparooz.com",
        },
        { production: true },
      ),
    ).toEqual({
      shopUrl: "https://poparooz.com/",
      beadsCollectionUrl: undefined,
      generatorPublicUrl: "https://generator.poparooz.com/",
      allowedParentOrigins: ["https://poparooz.com"],
    });
  });
});
