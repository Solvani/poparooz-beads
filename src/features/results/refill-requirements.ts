export const NOMINAL_BEADS_PER_COLOR = 1000 as const;

export interface PatternColorCount {
  readonly index: number;
  readonly code: string;
  readonly beadCount: number;
}

export interface RefillRequirement {
  readonly colorIndex: number;
  readonly code: string;
  readonly patternBeadCount: number;
  readonly includedBaseQuantity: typeof NOMINAL_BEADS_PER_COLOR;
  readonly refillPacksRequired: number;
}

export interface RefillRequirementResult {
  readonly requirements: readonly RefillRequirement[];
  readonly totalRefillPacks: number;
}

export function calculateRefillPacksRequired(beadCount: number): number {
  if (!Number.isSafeInteger(beadCount) || beadCount <= 0) {
    throw new TypeError("Pattern bead counts must be positive safe integers.");
  }
  return Math.max(0, Math.ceil(beadCount / NOMINAL_BEADS_PER_COLOR) - 1);
}

export function calculateRefillRequirements(
  patternColors: readonly PatternColorCount[],
): RefillRequirementResult {
  const indexes = new Set<number>();
  const codes = new Set<string>();
  const requirements: RefillRequirement[] = [];
  for (const color of patternColors) {
    if (
      !Number.isSafeInteger(color.index) ||
      color.index < 0 ||
      color.code.trim() === "" ||
      color.code !== color.code.trim() ||
      indexes.has(color.index) ||
      codes.has(color.code)
    ) {
      throw new TypeError("Pattern color requirements are invalid.");
    }
    indexes.add(color.index);
    codes.add(color.code);
    const refillPacksRequired = calculateRefillPacksRequired(color.beadCount);
    if (refillPacksRequired > 0) {
      requirements.push(
        Object.freeze({
          colorIndex: color.index,
          code: color.code,
          patternBeadCount: color.beadCount,
          includedBaseQuantity: NOMINAL_BEADS_PER_COLOR,
          refillPacksRequired,
        }),
      );
    }
  }
  requirements.sort(
    (left, right) =>
      left.colorIndex - right.colorIndex || left.code.localeCompare(right.code),
  );
  return Object.freeze({
    requirements: Object.freeze(requirements),
    totalRefillPacks: requirements.reduce(
      (total, item) => total + item.refillPacksRequired,
      0,
    ),
  });
}
