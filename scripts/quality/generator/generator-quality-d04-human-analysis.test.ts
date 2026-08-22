import { describe, expect, it } from "vitest";

import {
  broadDirection,
  consensusStatus,
  linearWeightedCohensKappa,
  revealDirection,
  threeReviewerConsensus,
} from "./generator-quality-d04-human-analysis.ts";

describe("D04-A02 human analysis", () => {
  it("maps blind and revealed directions without changing strength", () => {
    expect(broadDirection("a_slightly_better")).toBe("A");
    expect(revealDirection("a_clearly_better", true)).toBe("larger");
    expect(revealDirection("a_clearly_better", false)).toBe("smaller");
    expect(revealDirection("no_meaningful_difference", true)).toBe("neutral");
  });

  it("keeps direct conflicts distinct from neutral and uncertain cases", () => {
    expect(consensusStatus("a_clearly_better", "b_slightly_better")).toBe(
      "direct_opposite_disagreement",
    );
    expect(
      consensusStatus("a_clearly_better", "no_meaningful_difference"),
    ).toBe("direction_neutral_disagreement");
    expect(consensusStatus("cannot_judge", "b_clearly_better")).toBe(
      "cannot_judge_uncertain",
    );
  });

  it("computes linear weighted kappa and excludes cannot-judge pairs", () => {
    const perfect = linearWeightedCohensKappa([
      ["a_clearly_better", "a_clearly_better"],
      ["no_meaningful_difference", "no_meaningful_difference"],
      ["b_clearly_better", "b_clearly_better"],
      ["cannot_judge", "cannot_judge"],
    ]);
    expect(perfect.includedPairCount).toBe(3);
    expect(perfect.excludedCannotJudgeCount).toBe(1);
    expect(perfect.kappa).toBe(1);
  });

  it("keeps three-reviewer majority, ambiguity, and uncertainty distinct", () => {
    expect(threeReviewerConsensus(["larger", "larger", "neutral"])).toEqual({
      status: "majority_directional_consensus",
      label: "larger",
    });
    expect(threeReviewerConsensus(["neutral", "neutral", "smaller"])).toEqual({
      status: "majority_neutral",
      label: "neutral",
    });
    expect(threeReviewerConsensus(["larger", "smaller", "neutral"])).toEqual({
      status: "persistent_ambiguity",
      label: "ambiguous",
    });
    expect(threeReviewerConsensus(["larger", "smaller", "cannot"])).toEqual({
      status: "uncertain",
      label: "uncertain",
    });
  });
});
