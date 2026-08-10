import type {
  ColorSetProfileOption,
  PatternSettingsDraft,
  PatternSettingsValue,
} from "./settings.types";
import { PATTERN_SIZE_PRESETS } from "./settings.types";

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
  const dimensionsValid = isPatternSizePreset(width) && width === height;
  const errors: PatternSettingsErrors = {
    ...(dimensionsValid
      ? {}
      : { dimensions: "Choose a supported square Pattern Size." }),
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

function isPatternSizePreset(value: number | null): value is number {
  return PATTERN_SIZE_PRESETS.some((preset) => preset.size === value);
}

function isColorCount(value: number | null): value is number {
  return value !== null && value >= 2 && value <= 64;
}
