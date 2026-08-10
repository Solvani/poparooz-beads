import type { ImageBackground } from "../../domain/image";
import type { PublishedColorSetProfileId } from "../../runtime/color-set/color-set.types";

export interface ColorSetProfileOption {
  readonly profileId: PublishedColorSetProfileId;
  readonly size: 24 | 48 | 72 | 120 | 168 | 221;
}

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
  width: "",
  height: "",
  maxColors: "32",
  background: "",
  selectedColorSetProfileId: "poparooz-set-221",
});
