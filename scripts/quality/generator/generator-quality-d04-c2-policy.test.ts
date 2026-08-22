import { describe, expect, it } from "vitest";

import {
  A02_C2_FROZEN_POLICY,
  evaluateA02C2FrozenPolicy,
} from "./generator-quality-d04-c2-policy.ts";

describe("D04-A02-C2 frozen evaluation policy", () => {
  it("recommends larger only when both frozen guards pass", () => {
    expect(
      evaluateA02C2FrozenPolicy({
        weightedMeanDeltaE00Gain: 2,
        additionalUsedColors: 1,
      }),
    ).toBe("recommend_larger");
    expect(
      evaluateA02C2FrozenPolicy({
        weightedMeanDeltaE00Gain: 1.999,
        additionalUsedColors: 5,
      }),
    ).toBe("abstain");
    expect(
      evaluateA02C2FrozenPolicy({
        weightedMeanDeltaE00Gain: 5,
        additionalUsedColors: 0,
      }),
    ).toBe("abstain");
  });

  it("keeps production activation outside the policy contract", () => {
    expect(A02_C2_FROZEN_POLICY.status).toBe("evaluation-only");
    expect(A02_C2_FROZEN_POLICY.abstainBehavior).toContain(
      "no automatic change",
    );
  });
});
