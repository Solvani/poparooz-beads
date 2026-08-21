import { describe, expect, it } from "vitest";

import {
  calculateRefillPacksRequired,
  calculateRefillRequirements,
  NOMINAL_BEADS_PER_COLOR,
} from "./refill-requirements";
import { recommendBeadSet } from "./recommendation-policy";
import { findRequiredApprovedBeadSet } from "./required-bead-set";

describe("refill requirements", () => {
  it.each([
    [999, 0],
    [1000, 0],
    [1001, 1],
    [1999, 1],
    [2000, 1],
    [2001, 2],
    [9679, 9],
  ])("calculates %i beads as %i refill packs", (beads, packs) => {
    expect(calculateRefillPacksRequired(beads)).toBe(packs);
  });

  it("returns only refill colors in stable Pattern color order", () => {
    expect(
      calculateRefillRequirements([
        { index: 7, code: "H7", beadCount: 8500 },
        { index: 3, code: "H6", beadCount: 2500 },
        { index: 1, code: "A1", beadCount: 1000 },
      ]),
    ).toEqual({
      requirements: [
        {
          colorIndex: 3,
          code: "H6",
          patternBeadCount: 2500,
          includedBaseQuantity: NOMINAL_BEADS_PER_COLOR,
          refillPacksRequired: 2,
        },
        {
          colorIndex: 7,
          code: "H7",
          patternBeadCount: 8500,
          includedBaseQuantity: NOMINAL_BEADS_PER_COLOR,
          refillPacksRequired: 8,
        },
      ],
      totalRefillPacks: 10,
    });
  });

  it("returns an immutable empty result when no refill is needed", () => {
    const result = calculateRefillRequirements([
      { index: 0, code: "A1", beadCount: 999 },
    ]);
    expect(result).toEqual({ requirements: [], totalRefillPacks: 0 });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.requirements)).toBe(true);
  });

  it("keeps coverage and recommendation independent from refill quantities", () => {
    const lowQuantity = [{ index: 0, code: "A2", beadCount: 1000 }];
    const highQuantity = [{ index: 0, code: "A2", beadCount: 2001 }];
    const lowRequired = findRequiredApprovedBeadSet(
      lowQuantity.map(({ code }) => code),
    );
    const highRequired = findRequiredApprovedBeadSet(
      highQuantity.map(({ code }) => code),
    );

    expect(highRequired).toEqual(lowRequired);
    expect(recommendBeadSet({ requiredBeadSet: highRequired })).toEqual(
      recommendBeadSet({ requiredBeadSet: lowRequired }),
    );
    expect(calculateRefillRequirements(lowQuantity).requirements).toEqual([]);
    expect(calculateRefillRequirements(highQuantity).requirements).toHaveLength(
      1,
    );

    const changedIdentityRequired = findRequiredApprovedBeadSet(["A20"]);
    expect(changedIdentityRequired).not.toEqual(lowRequired);
    expect(
      recommendBeadSet({ requiredBeadSet: changedIdentityRequired }),
    ).not.toEqual(recommendBeadSet({ requiredBeadSet: lowRequired }));
  });

  it.each([
    [{ index: 0, code: "A1", beadCount: 0 }],
    [{ index: -1, code: "A1", beadCount: 1 }],
    [{ index: 0, code: " ", beadCount: 1 }],
    [
      { index: 0, code: "A1", beadCount: 1 },
      { index: 0, code: "A2", beadCount: 1 },
    ],
    [
      { index: 0, code: "A1", beadCount: 1 },
      { index: 1, code: "A1", beadCount: 1 },
    ],
  ])("rejects invalid or duplicate Pattern colors", (...colors) => {
    expect(() => calculateRefillRequirements(colors)).toThrow(TypeError);
  });
});
