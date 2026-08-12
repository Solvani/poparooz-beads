import type { ImageBackground } from "../../domain/image";
import type { PublishedColorSetProfileId } from "../../runtime/color-set/color-set.types";

export interface ColorSetProfileOption {
  readonly profileId: PublishedColorSetProfileId;
  readonly size: 24 | 48 | 72 | 120 | 168 | 221;
}

export const PATTERN_SIZE_PRESETS = Object.freeze([
  Object.freeze({
    size: 40,
    label: "Small",
    guidance: "Best for icons and simple designs.",
  }),
  Object.freeze({
    size: 60,
    label: "Medium",
    guidance: "Best for simple portraits and pets.",
  }),
  Object.freeze({
    size: 80,
    label: "Recommended",
    guidance: "Best for most photos.",
  }),
  Object.freeze({
    size: 104,
    label: "Detailed",
    guidance: "Best for detailed photos.",
  }),
] as const);

export type PatternSizePreset = (typeof PATTERN_SIZE_PRESETS)[number]["size"];

export interface PatternSettingsDraft {
  readonly width: string;
  readonly height: string;
  readonly maxColors: string;
  readonly background: ImageBackground | "";
  readonly selectedColorSetProfileId: PublishedColorSetProfileId | "";
}

export interface PatternSettingsValue {
  readonly width: number;
  readonly height: number;
  readonly maxColors: number;
  readonly background: ImageBackground;
  readonly selectedColorSetProfileId: PublishedColorSetProfileId;
}

export const EMPTY_PATTERN_SETTINGS: PatternSettingsDraft = Object.freeze({
  width: "80",
  height: "80",
  maxColors: "32",
  background: "",
  selectedColorSetProfileId: "poparooz-set-221",
});
