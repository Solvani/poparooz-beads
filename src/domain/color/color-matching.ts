import {
  PaletteColorSchema,
  PaletteDefinitionSchema,
  type PaletteColor,
  type PaletteDefinition,
} from "../palette/internal";
import { deltaE2000 } from "./color-distance";
import { ColorMatchingError } from "./color-matching-errors";
import type {
  ColorMatchCandidate,
  ColorMatchResult,
  MatchableColor,
  PaletteMatchCandidate,
  PaletteMatchResult,
} from "./color-matching.types";
import { validateLabColor } from "./lab-validation";
import type { LabColor } from "./color.types";
import { isPoparoozColorCode } from "./poparooz-color-code";

export const MATCH_DISTANCE_EPSILON = 1e-12;

type CodeValidator = (value: unknown) => value is string;

function compareCode(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareTieBreak<TColor extends MatchableColor>(
  left: ColorMatchCandidate<TColor>,
  right: ColorMatchCandidate<TColor>,
): number {
  const sortOrderComparison =
    left.color.sortOrder < right.color.sortOrder
      ? -1
      : left.color.sortOrder > right.color.sortOrder
        ? 1
        : 0;
  return sortOrderComparison || compareCode(left.color.code, right.color.code);
}

function isEligible(color: MatchableColor): boolean {
  return color.active && color.autoMatchEligible;
}

function invalidCandidate(): never {
  throw new ColorMatchingError(
    "INVALID_PALETTE_CANDIDATE",
    "The palette contains an invalid matching candidate.",
  );
}

function validateMatchableColor<TColor extends MatchableColor>(
  color: TColor,
  isValidCode: CodeValidator,
): TColor {
  if (typeof color !== "object" || color === null) {
    return invalidCandidate();
  }
  const { code, lab, sortOrder, active, autoMatchEligible } = color;
  if (
    !isValidCode(code) ||
    !Array.isArray(lab) ||
    lab.length !== 3 ||
    typeof lab[0] !== "number" ||
    typeof lab[1] !== "number" ||
    typeof lab[2] !== "number" ||
    !Number.isFinite(lab[0]) ||
    !Number.isFinite(lab[1]) ||
    !Number.isFinite(lab[2]) ||
    lab[0] < 0 ||
    lab[0] > 100 ||
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0 ||
    typeof active !== "boolean" ||
    typeof autoMatchEligible !== "boolean"
  ) {
    return invalidCandidate();
  }
  return color;
}

function validateUniqueCodes<TColor extends MatchableColor>(
  candidates: readonly ColorMatchCandidate<TColor>[],
  isValidCode: CodeValidator,
): void {
  const codes = new Set<string>();
  for (const candidate of candidates) {
    if (typeof candidate !== "object" || candidate === null) {
      invalidCandidate();
    }
    const color = validateMatchableColor(candidate.color, isValidCode);
    if (codes.has(color.code)) invalidCandidate();
    codes.add(color.code);
  }
}

function prepareValidatedColorMatchCandidates<TColor extends MatchableColor>(
  colors: readonly TColor[],
  isValidCode: CodeValidator,
): readonly ColorMatchCandidate<TColor>[] {
  if (!Array.isArray(colors)) invalidCandidate();
  if (colors.length === 0) {
    throw new ColorMatchingError(
      "EMPTY_PALETTE",
      "The color collection contains no colors.",
    );
  }

  const candidates = colors.map((color) =>
    Object.freeze({ color: validateMatchableColor(color, isValidCode) }),
  );
  validateUniqueCodes(candidates, isValidCode);
  const eligible = candidates.filter(({ color }) => isEligible(color));
  if (eligible.length === 0) {
    throw new ColorMatchingError(
      "NO_ELIGIBLE_PALETTE_COLORS",
      "The color collection contains no eligible colors for automatic matching.",
    );
  }
  return Object.freeze([...eligible].sort(compareTieBreak));
}

export function prepareColorMatchCandidates<TColor extends MatchableColor>(
  colors: readonly TColor[],
): readonly ColorMatchCandidate<TColor>[] {
  return prepareValidatedColorMatchCandidates(colors, isPoparoozColorCode);
}

function matchNearestValidatedColor<TColor extends MatchableColor>(
  target: LabColor,
  candidates: readonly ColorMatchCandidate<TColor>[],
  isValidCode: CodeValidator,
): ColorMatchResult<TColor> {
  validateLabColor(target);
  if (!Array.isArray(candidates)) invalidCandidate();
  if (candidates.length === 0) {
    throw new ColorMatchingError(
      "EMPTY_PALETTE",
      "No color candidates were provided.",
    );
  }
  validateUniqueCodes(candidates, isValidCode);

  const evaluated = candidates.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      return invalidCandidate();
    }
    const color = validateMatchableColor(candidate.color, isValidCode);
    if (!isEligible(color)) invalidCandidate();
    const [l, a, b] = color.lab;
    const distance = deltaE2000(target, { l, a, b });
    if (!Number.isFinite(distance)) {
      throw new ColorMatchingError(
        "NON_FINITE_COLOR_DISTANCE",
        "The color distance calculation produced an invalid result.",
      );
    }
    return { candidate: Object.freeze({ color }), distance };
  });

  let minimumDistance = Number.POSITIVE_INFINITY;
  for (const { distance } of evaluated) {
    if (distance < minimumDistance) minimumDistance = distance;
  }

  let winner: (typeof evaluated)[number] | undefined;
  for (const entry of evaluated) {
    if (
      entry.distance <= minimumDistance + MATCH_DISTANCE_EPSILON &&
      (winner === undefined ||
        compareTieBreak(entry.candidate, winner.candidate) < 0)
    ) {
      winner = entry;
    }
  }
  if (winner === undefined || !Number.isFinite(winner.distance)) {
    throw new ColorMatchingError(
      "NON_FINITE_COLOR_DISTANCE",
      "The color distance calculation produced an invalid result.",
    );
  }
  return Object.freeze({
    color: winner.candidate.color,
    distance: Object.is(winner.distance, -0) ? 0 : winner.distance,
  });
}

export function matchNearestColor<TColor extends MatchableColor>(
  target: LabColor,
  candidates: readonly ColorMatchCandidate<TColor>[],
): ColorMatchResult<TColor> {
  return matchNearestValidatedColor(target, candidates, isPoparoozColorCode);
}

interface LegacyMatchableColor extends MatchableColor {
  readonly source: PaletteColor;
}

function toLegacyMatchableColor(color: PaletteColor): LegacyMatchableColor {
  return Object.freeze({
    code: color.displayCode,
    lab: color.lab,
    sortOrder: color.sortOrder,
    active: color.isActive,
    autoMatchEligible: color.isAutoMatchEnabled,
    source: color,
  });
}

function isValidatedLegacyDisplayCode(value: unknown): value is string {
  return typeof value === "string";
}

/** Legacy PaletteDefinition compatibility for the current Pattern pipeline. */
export function preparePaletteCandidates(
  palette: PaletteDefinition,
): readonly PaletteMatchCandidate[] {
  if (
    typeof palette === "object" &&
    palette !== null &&
    Array.isArray((palette as { colors?: unknown }).colors) &&
    (palette as { colors: unknown[] }).colors.length === 0
  ) {
    throw new ColorMatchingError(
      "EMPTY_PALETTE",
      "The palette contains no colors.",
    );
  }

  const parsed = PaletteDefinitionSchema.safeParse(palette);
  if (!parsed.success) {
    invalidCandidate();
  }

  return Object.freeze(
    prepareValidatedColorMatchCandidates(
      parsed.data.colors.map(toLegacyMatchableColor),
      isValidatedLegacyDisplayCode,
    ).map(({ color }) => Object.freeze({ color: color.source })),
  );
}

function validateLegacyCandidate(
  candidate: PaletteMatchCandidate,
): LegacyMatchableColor {
  if (typeof candidate !== "object" || candidate === null) {
    return invalidCandidate();
  }

  const parsed = PaletteColorSchema.safeParse(candidate.color);
  if (!parsed.success) {
    return invalidCandidate();
  }
  return toLegacyMatchableColor(parsed.data);
}

/**
 * Legacy PaletteDefinition compatibility for the current Pattern pipeline.
 * Direct Legacy candidate arrays must contain unique normalized displayCode
 * values. Duplicate normalized displayCode candidates are rejected, and
 * referenceCode is not used as a fallback tie-break.
 */
export function matchNearestPaletteColor(
  target: LabColor,
  candidates: readonly PaletteMatchCandidate[],
): PaletteMatchResult {
  if (!Array.isArray(candidates)) {
    invalidCandidate();
  }
  if (candidates.length === 0) {
    throw new ColorMatchingError(
      "EMPTY_PALETTE",
      "No palette candidates were provided.",
    );
  }

  const winner = matchNearestValidatedColor(
    target,
    candidates.map((candidate) =>
      Object.freeze({ color: validateLegacyCandidate(candidate) }),
    ),
    isValidatedLegacyDisplayCode,
  );
  return Object.freeze({
    color: winner.color.source,
    distance: winner.distance,
  });
}
