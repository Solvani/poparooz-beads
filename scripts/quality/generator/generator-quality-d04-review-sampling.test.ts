import { describe, expect, it } from "vitest";

import {
  deterministicPairOrder,
  selectStratifiedReviewSample,
  type ReviewSamplingCandidate,
} from "./generator-quality-d04-review-sampling.ts";

describe("D04-A02 blind review sampling", () => {
  it("selects a deterministic 60-pair sample with all cases represented", () => {
    const candidates = fixtureCandidates();
    const first = selectStratifiedReviewSample(candidates);
    const second = selectStratifiedReviewSample(candidates);

    expect(first).toEqual(second);
    expect(first).toHaveLength(60);
    expect(new Set(first.map((item) => item.logicalCaseId))).toHaveLength(24);
    expect(
      first.filter((item) => item.modelReviewDirection === "larger_worse"),
    ).toHaveLength(19);
  });

  it("keeps pair order deterministic and hidden from sampling metadata", () => {
    expect(deterministicPairOrder("example")).toBe(
      deterministicPairOrder("example"),
    );
  });

  it("rejects out-of-range reviewer workloads", () => {
    expect(() => selectStratifiedReviewSample(fixtureCandidates(), 39)).toThrow(
      "between 40 and 80",
    );
  });
});

function fixtureCandidates(): readonly ReviewSamplingCandidate[] {
  const candidates: ReviewSamplingCandidate[] = [];
  for (let caseIndex = 0; caseIndex < 24; caseIndex += 1) {
    for (let comparison = 0; comparison < 5; comparison += 1) {
      const ordinal = caseIndex * 5 + comparison;
      candidates.push({
        id: `case-${caseIndex}:comparison-${comparison}`,
        logicalCaseId: `case-${caseIndex}`,
        split: caseIndex % 3 === 0 ? "validation" : "calibration",
        maxColors: [16, 32, 64][comparison % 3]!,
        patternSize: 104,
        meanDeltaE00Gain: ordinal / 10,
        modelReviewDirection:
          ordinal < 19
            ? "larger_worse"
            : ordinal < 50
              ? "larger_better"
              : ordinal < 80
                ? "not_meaningful"
                : null,
      });
    }
  }
  return candidates;
}
