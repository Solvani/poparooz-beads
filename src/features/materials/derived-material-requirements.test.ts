import { describe, expect, it } from "vitest";

import type { PublicMaterialRequirement } from "../../domain/pattern/public-pattern.types";
import {
  deriveMaterialRequirementsV1,
  NOMINAL_BEADS_PER_COLOR,
} from "./derived-material-requirements";
import { recommendBeadSet } from "../results/recommendation-policy";
import { findRequiredApprovedBeadSet } from "../results/required-bead-set";

const color = Object.freeze({
  brand: "Poparooz" as const,
  code: "A1",
  hex: "#112233",
});

function material(
  beadCount: number,
  patternColorIndex = 0,
): PublicMaterialRequirement {
  return Object.freeze({ patternColorIndex, color, beadCount });
}

describe("deriveMaterialRequirementsV1", () => {
  it.each([
    [0, 0, 0],
    [1, 1, 0],
    [999, 1, 0],
    [1000, 1, 0],
    [1001, 2, 1],
    [2000, 2, 1],
    [2001, 3, 2],
  ])(
    "derives the frozen pack boundary for %i beads",
    (beadCount, totalPacksRequired, additionalRefillPacks) => {
      expect(deriveMaterialRequirementsV1([material(beadCount)])).toEqual([
        {
          patternColorIndex: 0,
          color,
          beadCount,
          nominalBeadsPerColor: NOMINAL_BEADS_PER_COLOR,
          totalPacksRequired,
          additionalRefillPacks,
        },
      ]);
    },
  );

  it("passes through material authority, preserves input order, and adds only V1 fields", () => {
    const first = material(2001, 9);
    const second = material(1, 2);
    const input = Object.freeze([first, second]);
    const before = [...input];

    const result = deriveMaterialRequirementsV1(input);

    expect(result.map((entry) => entry.patternColorIndex)).toEqual([9, 2]);
    expect(result.map((entry) => entry.beadCount)).toEqual([2001, 1]);
    expect(result[0]?.color).toBe(first.color);
    expect(Object.keys(result[0]!).sort()).toEqual(
      [
        "patternColorIndex",
        "color",
        "beadCount",
        "nominalBeadsPerColor",
        "totalPacksRequired",
        "additionalRefillPacks",
      ].sort(),
    );
    expect(input).toEqual(before);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.every(Object.isFrozen)).toBe(true);
  });

  it("is deterministic and does not mutate an unfrozen input array or materials", () => {
    const first = { patternColorIndex: 3, color, beadCount: 1001 };
    const second = { patternColorIndex: 1, color, beadCount: 0 };
    const input = [first, second];
    const snapshot = structuredClone(input);

    const firstResult = deriveMaterialRequirementsV1(input);
    const secondResult = deriveMaterialRequirementsV1(input);

    expect(firstResult).toEqual(secondResult);
    expect(input).toEqual(snapshot);
    expect(input[0]).toBe(first);
    expect(input[1]).toBe(second);
  });

  it("keeps Required and Recommended independent from material quantity", () => {
    const lowRequired = findRequiredApprovedBeadSet(["A2"]);
    const highRequired = findRequiredApprovedBeadSet(["A2"]);
    const lowQuantity = deriveMaterialRequirementsV1([material(1000)]);
    const highQuantity = deriveMaterialRequirementsV1([material(2001)]);

    expect(lowRequired).not.toBeNull();
    if (lowRequired === null) throw new Error("Expected an approved bead set.");
    expect(highRequired).toEqual(lowRequired);
    const lowRecommended = recommendBeadSet({ requiredBeadSet: lowRequired });
    const highRecommended = recommendBeadSet({
      requiredBeadSet: highRequired,
    });
    expect(lowQuantity[0]?.additionalRefillPacks).toBe(0);
    expect(highQuantity[0]?.additionalRefillPacks).toBe(2);
    expect(highRecommended).toEqual(lowRecommended);
    expect(lowRecommended).toMatchObject(lowRequired);
  });

  it.each([
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid beadCount %s", (beadCount) => {
    expect(() => deriveMaterialRequirementsV1([material(beadCount)])).toThrow(
      TypeError,
    );
  });
});
