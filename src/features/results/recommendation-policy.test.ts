import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { recommendBeadSet } from "./recommendation-policy";
import type { RequiredBeadSetResult } from "./required-bead-set";

function required(size: 168 | 221): RequiredBeadSetResult {
  return Object.freeze({
    profileId: `poparooz-set-${size}`,
    size,
    label: `${size}-Color Set`,
  });
}

describe("Recommendation Policy v1", () => {
  it.each([168, 221] as const)(
    "returns Required %i as an independent Recommended result",
    (size) => {
      const requiredBeadSet = required(size);
      const recommended = recommendBeadSet({ requiredBeadSet });

      expect(recommended).toMatchObject({
        profileId: `poparooz-set-${size}`,
        size,
        policyId: "poparooz-recommendation-policy",
        policyVersion: "1.0.0",
      });
      expect(recommended).not.toBe(requiredBeadSet);
      expect(Object.isFrozen(recommended)).toBe(true);
      expect(recommended!.size).toBeGreaterThanOrEqual(requiredBeadSet.size);
    },
  );

  it("fails safely when no Required set exists", () => {
    expect(recommendBeadSet({ requiredBeadSet: null })).toBeNull();
  });

  it("has no runtime evidence, evaluator, threshold, or scoring dependency", () => {
    const source = readFileSync(
      "src/features/results/recommendation-policy.ts",
      "utf8",
    );
    for (const forbidden of [
      "data-source",
      "e05-production-evidence",
      "bead-set-quality",
      "DeltaE",
      "threshold",
      "score",
      "category",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
