import {
  PaletteColorSchema,
  PaletteDefinitionSchema,
  type PaletteColor,
  type PaletteDefinition,
} from "../palette/internal";
import { deltaE2000 } from "./color-distance";
import { ColorMatchingError } from "./color-matching-errors";
import type {
  PaletteMatchCandidate,
  PaletteMatchResult,
} from "./color-matching.types";
import { validateLabColor } from "./lab-validation";
import type { LabColor } from "./color.types";

export const MATCH_DISTANCE_EPSILON = 1e-12;

function compareCode(left: string, right: string): number {
  const normalizedLeft = left.toUpperCase();
  const normalizedRight = right.toUpperCase();
  return normalizedLeft < normalizedRight
    ? -1
    : normalizedLeft > normalizedRight
      ? 1
      : 0;
}

function compareTieBreak(
  left: PaletteMatchCandidate,
  right: PaletteMatchCandidate,
): number {
  const sortOrderComparison =
    left.color.sortOrder < right.color.sortOrder
      ? -1
      : left.color.sortOrder > right.color.sortOrder
        ? 1
        : 0;
  return (
    sortOrderComparison ||
    compareCode(left.color.displayCode, right.color.displayCode) ||
    compareCode(left.color.referenceCode, right.color.referenceCode)
  );
}

function isEligible(color: PaletteColor): boolean {
  return color.isActive && color.isSellable && color.isAutoMatchEnabled;
}

function invalidCandidate(): never {
  throw new ColorMatchingError(
    "INVALID_PALETTE_CANDIDATE",
    "The palette contains an invalid matching candidate.",
  );
}

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

  const candidates = parsed.data.colors
    .filter(isEligible)
    .map((color) => Object.freeze({ color }))
    .sort(compareTieBreak);

  if (candidates.length === 0) {
    throw new ColorMatchingError(
      "NO_ELIGIBLE_PALETTE_COLORS",
      "The palette contains no eligible colors for automatic matching.",
    );
  }

  return Object.freeze(candidates);
}

function validateCandidate(
  candidate: PaletteMatchCandidate,
): PaletteMatchCandidate {
  if (typeof candidate !== "object" || candidate === null) {
    return invalidCandidate();
  }

  const parsed = PaletteColorSchema.safeParse(candidate.color);
  if (!parsed.success || !isEligible(parsed.data)) {
    return invalidCandidate();
  }

  return Object.freeze({ color: parsed.data });
}

export function matchNearestPaletteColor(
  target: LabColor,
  candidates: readonly PaletteMatchCandidate[],
): PaletteMatchResult {
  validateLabColor(target);

  if (!Array.isArray(candidates)) {
    invalidCandidate();
  }
  if (candidates.length === 0) {
    throw new ColorMatchingError(
      "EMPTY_PALETTE",
      "No palette candidates were provided.",
    );
  }

  const evaluated = candidates.map((candidate) => {
    const validated = validateCandidate(candidate);
    const [l, a, b] = validated.color.lab;
    const distance = deltaE2000(target, { l, a, b });
    if (!Number.isFinite(distance)) {
      throw new ColorMatchingError(
        "NON_FINITE_COLOR_DISTANCE",
        "The color distance calculation produced an invalid result.",
      );
    }
    return { candidate: validated, distance };
  });

  let minimumDistance = Number.POSITIVE_INFINITY;
  for (const { distance } of evaluated) {
    if (distance < minimumDistance) {
      minimumDistance = distance;
    }
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
