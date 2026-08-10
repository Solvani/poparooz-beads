export type PublishedColorSetProfileId =
  | "poparooz-set-24"
  | "poparooz-set-48"
  | "poparooz-set-72"
  | "poparooz-set-120"
  | "poparooz-set-168"
  | "poparooz-set-221";

export interface ColorSetGroup {
  readonly group: number;
  readonly memberCodes: readonly string[];
}
export interface PublishedColorSetProfile {
  readonly profileId: PublishedColorSetProfileId;
  readonly size: 24 | 48 | 72 | 120 | 168 | 221;
  readonly groups: readonly number[];
  readonly memberCodes: readonly string[];
}
export interface ColorSetArtifact {
  readonly schemaVersion: "1.0.0";
  readonly artifactVersion: "1.0.0";
  readonly colorSetId: "poparooz-fixed-color-sets";
  readonly colorSetVersion: "1.0.0";
  readonly groups: readonly ColorSetGroup[];
  readonly profiles: readonly PublishedColorSetProfile[];
}
export type ColorSetSnapshot = ColorSetArtifact;
export interface ColorSetProvider {
  getSnapshot(): ColorSetSnapshot;
  selectPublishedProfile(profileId: string): PublishedColorSetProfile;
}
