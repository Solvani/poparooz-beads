import { describe, expect, it } from "vitest";

import {
  BENCHMARK_FIXTURES,
  createBenchmarkRgbaFixture,
} from "./benchmark-fixtures";

function pixels(data: Uint8ClampedArray): string[] {
  const result: string[] = [];
  for (let offset = 0; offset < data.length; offset += 4) {
    result.push(Array.from(data.slice(offset, offset + 4)).join(","));
  }
  return result;
}

describe("P1-A10 deterministic benchmark fixtures", () => {
  const definition = BENCHMARK_FIXTURES[2]!;

  it.each([
    "solid-blocks",
    "horizontal-gradient",
    "vertical-gradient",
    "checker",
    "accented",
    "transparent-edge",
    "semi-transparent",
    "rearranged",
  ] as const)("recreates %s byte-for-byte", (pattern) => {
    expect(createBenchmarkRgbaFixture(definition, pattern)).toEqual(
      createBenchmarkRgbaFixture(definition, pattern),
    );
  });

  it("keeps the checker histogram while rearranging its positions", () => {
    const checker = createBenchmarkRgbaFixture(definition, "checker");
    const rearranged = createBenchmarkRgbaFixture(definition, "rearranged");

    expect(rearranged.data).not.toEqual(checker.data);
    expect(pixels(rearranged.data).sort()).toEqual(pixels(checker.data).sort());
  });

  it("covers transparent and semi-transparent alpha behavior", () => {
    const transparent = createBenchmarkRgbaFixture(
      definition,
      "transparent-edge",
    );
    const semiTransparent = createBenchmarkRgbaFixture(
      definition,
      "semi-transparent",
    );

    expect(pixels(transparent.data).some((pixel) => pixel.endsWith(",0"))).toBe(
      true,
    );
    expect(
      pixels(semiTransparent.data).every((pixel) => pixel.endsWith(",128")),
    ).toBe(true);
  });
});
