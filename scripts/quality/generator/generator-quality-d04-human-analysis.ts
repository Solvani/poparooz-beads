export const HUMAN_REVIEW_CHOICES = Object.freeze([
  "a_clearly_better",
  "a_slightly_better",
  "no_meaningful_difference",
  "b_slightly_better",
  "b_clearly_better",
  "cannot_judge",
] as const);

export type HumanReviewChoice = (typeof HUMAN_REVIEW_CHOICES)[number];
export type BlindBroadDirection = "A" | "B" | "neutral" | "cannot";
export type RevealedDirection = "larger" | "smaller" | "neutral" | "cannot";
export type ConsensusStatus =
  | "exact_direction_agreement"
  | "soft_direction_agreement"
  | "neutral_agreement"
  | "direct_opposite_disagreement"
  | "direction_neutral_disagreement"
  | "cannot_judge_uncertain";

export function broadDirection(choice: HumanReviewChoice): BlindBroadDirection {
  if (choice.startsWith("a_")) return "A";
  if (choice.startsWith("b_")) return "B";
  return choice === "no_meaningful_difference" ? "neutral" : "cannot";
}

export function revealDirection(
  choice: HumanReviewChoice,
  leftIsLarger: boolean,
): RevealedDirection {
  const broad = broadDirection(choice);
  if (broad === "neutral" || broad === "cannot") return broad;
  const choseLeft = broad === "A";
  return choseLeft === leftIsLarger ? "larger" : "smaller";
}

export function consensusStatus(
  first: HumanReviewChoice,
  second: HumanReviewChoice,
): ConsensusStatus {
  const firstBroad = broadDirection(first);
  const secondBroad = broadDirection(second);
  if (firstBroad === "cannot" || secondBroad === "cannot") {
    return "cannot_judge_uncertain";
  }
  if (firstBroad === "neutral" && secondBroad === "neutral") {
    return "neutral_agreement";
  }
  if (
    (firstBroad === "A" && secondBroad === "B") ||
    (firstBroad === "B" && secondBroad === "A")
  ) {
    return "direct_opposite_disagreement";
  }
  if (firstBroad !== secondBroad) return "direction_neutral_disagreement";
  return first === second
    ? "exact_direction_agreement"
    : "soft_direction_agreement";
}

export function linearWeightedCohensKappa(
  pairs: readonly (readonly [HumanReviewChoice, HumanReviewChoice])[],
): Readonly<{
  includedPairCount: number;
  excludedCannotJudgeCount: number;
  observedWeightedAgreement: number;
  expectedWeightedAgreement: number;
  kappa: number | null;
}> {
  const score = new Map<HumanReviewChoice, number>([
    ["a_clearly_better", 0],
    ["a_slightly_better", 1],
    ["no_meaningful_difference", 2],
    ["b_slightly_better", 3],
    ["b_clearly_better", 4],
  ]);
  const included = pairs.filter(
    ([first, second]) => first !== "cannot_judge" && second !== "cannot_judge",
  );
  if (included.length === 0) {
    return Object.freeze({
      includedPairCount: 0,
      excludedCannotJudgeCount: pairs.length,
      observedWeightedAgreement: 0,
      expectedWeightedAgreement: 0,
      kappa: null,
    });
  }
  const countsFirst = [0, 0, 0, 0, 0];
  const countsSecond = [0, 0, 0, 0, 0];
  let observedWeightedAgreement = 0;
  for (const [first, second] of included) {
    const firstScore = score.get(first)!;
    const secondScore = score.get(second)!;
    countsFirst[firstScore] += 1;
    countsSecond[secondScore] += 1;
    observedWeightedAgreement += 1 - Math.abs(firstScore - secondScore) / 4;
  }
  observedWeightedAgreement /= included.length;
  let expectedWeightedAgreement = 0;
  for (let first = 0; first < 5; first += 1) {
    for (let second = 0; second < 5; second += 1) {
      expectedWeightedAgreement +=
        (countsFirst[first]! / included.length) *
        (countsSecond[second]! / included.length) *
        (1 - Math.abs(first - second) / 4);
    }
  }
  return Object.freeze({
    includedPairCount: included.length,
    excludedCannotJudgeCount: pairs.length - included.length,
    observedWeightedAgreement,
    expectedWeightedAgreement,
    kappa:
      expectedWeightedAgreement === 1
        ? null
        : (observedWeightedAgreement - expectedWeightedAgreement) /
          (1 - expectedWeightedAgreement),
  });
}

export function isHumanReviewChoice(
  value: unknown,
): value is HumanReviewChoice {
  return HUMAN_REVIEW_CHOICES.includes(value as HumanReviewChoice);
}
