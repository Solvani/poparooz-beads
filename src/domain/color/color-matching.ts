import {
  PaletteColorSchema,
  PaletteDefinitionSchema,
  type PaletteColor,
  type PaletteDefinition,
} from "../palette/internal";
import type {
  MatchableColor,
  PaletteMatchCandidate,
  PaletteMatchResult,
} from "./color-matching.types";
import type { LabColor } from "./color.types";
import { ColorMatchingError } from "./color-matching-errors";
import {
  invalidColorMatchCandidate,
  matchNearestValidatedColor,
  prepareValidatedColorMatchCandidates,
} from "./generation-color-matching";

export {
  MATCH_DISTANCE_EPSILON,
  matchNearestColor,
  prepareColorMatchCandidates,
} from "./generation-color-matching";

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
    invalidColorMatchCandidate();
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
    return invalidColorMatchCandidate();
  }

  const parsed = PaletteColorSchema.safeParse(candidate.color);
  if (!parsed.success) {
    return invalidColorMatchCandidate();
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
    invalidColorMatchCandidate();
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
