import {
  MAX_TARGET_DIMENSION,
  MAX_TARGET_PIXELS,
  MIN_TARGET_DIMENSION,
} from "../../domain/image";
import type {
  ColorSetProfileOption,
  PatternSettingsDraft,
  PatternSettingsValue,
} from "./settings.types";

export interface PatternSettingsErrors {
  readonly width?: string;
  readonly height?: string;
  readonly maxColors?: string;
  readonly background?: string;
  readonly selectedColorSetProfileId?: string;
  readonly dimensions?: string;
}

export type PatternSettingsValidation =
  | { readonly valid: true; readonly value: PatternSettingsValue }
  | { readonly valid: false; readonly errors: PatternSettingsErrors };

export function validatePatternSettings(
  draft: PatternSettingsDraft,
  colorSetProfiles: readonly ColorSetProfileOption[],
): PatternSettingsValidation {
  const width = parseContractInteger(draft.width);
  const height = parseContractInteger(draft.height);
  const maxColors = parseContractInteger(draft.maxColors);
  const errors: PatternSettingsErrors = {
    ...(isDimension(width)
      ? {}
      : { width: "Enter a whole number from 1 to 4096." }),
    ...(isDimension(height)
      ? {}
      : { height: "Enter a whole number from 1 to 4096." }),
    ...(isColorCount(maxColors)
      ? {}
      : { maxColors: "Enter a whole number from 2 to 64." }),
    ...(draft.background === "white" || draft.background === "transparent"
      ? {}
      : { background: "Choose White or Transparent." }),
    ...(colorSetProfiles.some(
      (profile) => profile.profileId === draft.selectedColorSetProfileId,
    )
      ? {}
      : { selectedColorSetProfileId: "Choose an available Color Set." }),
    ...(isDimension(width) &&
    isDimension(height) &&
    width > Math.floor(MAX_TARGET_PIXELS / height)
      ? { dimensions: "Width and height exceed the supported pixel limit." }
      : {}),
  };

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return {
    valid: true,
    value: {
      width: width!,
      height: height!,
      maxColors: maxColors!,
      background: draft.background as PatternSettingsValue["background"],
      selectedColorSetProfileId:
        draft.selectedColorSetProfileId as PatternSettingsValue["selectedColorSetProfileId"],
    },
  };
}

function parseContractInteger(input: string): number | null {
  if (!/^\d+$/.test(input)) return null;
  const value = Number(input);
  return Number.isSafeInteger(value) ? value : null;
}

function isDimension(value: number | null): value is number {
  return (
    value !== null &&
    value >= MIN_TARGET_DIMENSION &&
    value <= MAX_TARGET_DIMENSION
  );
}

function isColorCount(value: number | null): value is number {
  return value !== null && value >= 2 && value <= 64;
}
