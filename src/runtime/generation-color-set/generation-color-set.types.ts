import type { PublishedColorSetProfileId } from "../color-set/color-set.types";

export interface GenerationColorSetProfile {
  readonly profileId: PublishedColorSetProfileId;
  readonly size: 24 | 48 | 72 | 120 | 168 | 221;
  readonly memberCodes: readonly string[];
}
export interface GenerationColorSetSnapshot {
  readonly identity: {
    readonly schemaVersion: "1.0.0";
    readonly artifactVersion: "1.0.0";
    readonly colorSetId: "poparooz-fixed-color-sets";
    readonly colorSetVersion: "1.0.0";
  };
  readonly profiles: readonly GenerationColorSetProfile[];
}
