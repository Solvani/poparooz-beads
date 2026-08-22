import { createHash } from "node:crypto";

export type ModelReviewDirection =
  "larger_better" | "larger_worse" | "not_meaningful";

export interface ReviewSamplingCandidate {
  readonly id: string;
  readonly logicalCaseId: string;
  readonly split: "calibration" | "validation";
  readonly maxColors: number;
  readonly patternSize: number;
  readonly meanDeltaE00Gain: number;
  readonly modelReviewDirection: ModelReviewDirection | null;
}

export function selectStratifiedReviewSample<
  Candidate extends ReviewSamplingCandidate,
>(candidates: readonly Candidate[], targetCount = 60): readonly Candidate[] {
  if (targetCount < 40 || targetCount > 80) {
    throw new Error("Review sample target must remain between 40 and 80.");
  }
  const unique = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );
  if (unique.size !== candidates.length || unique.size < targetCount) {
    throw new Error("Review sampling candidates are invalid or insufficient.");
  }
  const selected = new Map<string, Candidate>();
  const add = (candidate: Candidate): void => {
    if (selected.size < targetCount) selected.set(candidate.id, candidate);
  };
  const stable = (items: readonly Candidate[]) =>
    [...items].sort(
      (left, right) =>
        stableHash(left.id).localeCompare(stableHash(right.id)) ||
        left.id.localeCompare(right.id),
    );

  for (const candidate of stable(
    candidates.filter((item) => item.modelReviewDirection === "larger_worse"),
  )) {
    add(candidate);
  }
  for (const direction of ["larger_better", "not_meaningful"] as const) {
    const limit = direction === "larger_better" ? 12 : 9;
    for (const candidate of stable(
      candidates.filter((item) => item.modelReviewDirection === direction),
    ).slice(0, limit)) {
      add(candidate);
    }
  }

  for (const patternSize of [40, 60, 80, 104]) {
    for (const candidate of stable(
      candidates.filter((item) => item.patternSize === patternSize),
    )) {
      if (
        [...selected.values()].filter(
          (item) => item.patternSize === patternSize,
        ).length >= 3
      ) {
        break;
      }
      add(candidate);
    }
  }

  const caseIds = [
    ...new Set(candidates.map((item) => item.logicalCaseId)),
  ].sort();
  for (const caseId of caseIds) {
    if ([...selected.values()].some((item) => item.logicalCaseId === caseId)) {
      continue;
    }
    const caseCandidates = candidates.filter(
      (item) => item.logicalCaseId === caseId,
    );
    const preferredMaxColors = [16, 32, 64][stableByte(caseId) % 3]!;
    const preferred = caseCandidates.filter(
      (item) =>
        item.maxColors === preferredMaxColors && item.patternSize === 104,
    );
    add(stable(preferred.length > 0 ? preferred : caseCandidates)[0]!);
  }

  const remaining = candidates.filter((item) => !selected.has(item.id));
  const byGain = [...remaining].sort(
    (left, right) =>
      left.meanDeltaE00Gain - right.meanDeltaE00Gain ||
      left.id.localeCompare(right.id),
  );
  const informationOrder: Candidate[] = [];
  for (
    let low = 0, high = byGain.length - 1;
    low <= high;
    low += 1, high -= 1
  ) {
    informationOrder.push(byGain[low]!);
    if (high !== low) informationOrder.push(byGain[high]!);
  }
  for (const candidate of informationOrder) add(candidate);

  const result = [...selected.values()];
  if (result.length !== targetCount) {
    throw new Error("Review sampling did not reach its target.");
  }
  return Object.freeze(
    result.sort(
      (left, right) =>
        stableHash(`packet:${left.id}`).localeCompare(
          stableHash(`packet:${right.id}`),
        ) || left.id.localeCompare(right.id),
    ),
  );
}

export function deterministicPairOrder(
  candidateId: string,
): "forward" | "reverse" {
  return stableByte(`pair:${candidateId}`) % 2 === 0 ? "forward" : "reverse";
}

function stableByte(value: string): number {
  return createHash("sha256").update(value).digest()[0]!;
}

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
