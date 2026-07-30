import type { ImageBackground } from "../../domain/image";

export interface PatternSettingsDraft {
  readonly width: string;
  readonly height: string;
  readonly maxColors: string;
  readonly background: ImageBackground | "";
}

export interface PatternSettingsValue {
  readonly width: number;
  readonly height: number;
  readonly maxColors: number;
  readonly background: ImageBackground;
}

export const EMPTY_PATTERN_SETTINGS: PatternSettingsDraft = Object.freeze({
  width: "",
  height: "",
  maxColors: "",
  background: "",
});
