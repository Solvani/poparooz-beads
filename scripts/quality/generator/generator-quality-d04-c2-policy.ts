export interface A02C2PolicyFeatures {
  readonly weightedMeanDeltaE00Gain: number;
  readonly additionalUsedColors: number;
}

export const A02_C2_FROZEN_POLICY = Object.freeze({
  schemaVersion: "1.0.0",
  policyId: "a02-c2-conservative-adjacent-larger-v1",
  status: "evaluation-only",
  featureSet: Object.freeze([
    "weightedMeanDeltaE00Gain",
    "additionalUsedColors",
  ]),
  thresholds: Object.freeze({
    weightedMeanDeltaE00GainMinimum: 2,
    additionalUsedColorsMinimum: 1,
  }),
  decisionOrdering: Object.freeze([
    "recommend_larger_when_all_thresholds_pass",
    "otherwise_abstain",
  ]),
  tieBehavior: "threshold equality passes",
  abstainBehavior: "retain current profile; no automatic change",
} as const);

export type A02C2PolicyDecision = "recommend_larger" | "abstain";

export function evaluateA02C2FrozenPolicy(
  features: A02C2PolicyFeatures,
): A02C2PolicyDecision {
  return features.weightedMeanDeltaE00Gain >=
    A02_C2_FROZEN_POLICY.thresholds.weightedMeanDeltaE00GainMinimum &&
    features.additionalUsedColors >=
      A02_C2_FROZEN_POLICY.thresholds.additionalUsedColorsMinimum
    ? "recommend_larger"
    : "abstain";
}
