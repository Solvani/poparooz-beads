import { ColorSetBrowserError } from "./color-set.errors";
import { parseColorSetArtifact } from "./color-set.schema";
import type {
  ColorSetArtifact,
  ColorSetProvider,
  ColorSetSnapshot,
  PublishedColorSetProfile,
} from "./color-set.types";

export function createColorSetProvider(input: unknown): ColorSetProvider {
  try {
    const snapshot = immutableSnapshot(parseColorSetArtifact(input));
    const profiles = new Map<string, PublishedColorSetProfile>(
      snapshot.profiles.map((profile) => [profile.profileId, profile]),
    );
    return Object.freeze({
      getSnapshot: () => snapshot,
      selectPublishedProfile(profileId: string) {
        const profile = profiles.get(profileId);
        if (profile === undefined)
          throw new ColorSetBrowserError("COLOR_SET_PROFILE_UNSUPPORTED");
        return profile;
      },
    });
  } catch (error) {
    if (error instanceof ColorSetBrowserError) throw error;
    throw new ColorSetBrowserError("COLOR_SET_PROVIDER_INITIALIZATION_FAILED");
  }
}

function immutableSnapshot(artifact: ColorSetArtifact): ColorSetSnapshot {
  const groups = Object.freeze(
    artifact.groups.map((group) =>
      Object.freeze({
        group: group.group,
        memberCodes: Object.freeze([...group.memberCodes]),
      }),
    ),
  );
  const profiles = Object.freeze(artifact.profiles.map(copyProfile));
  return Object.freeze({
    schemaVersion: artifact.schemaVersion,
    artifactVersion: artifact.artifactVersion,
    colorSetId: artifact.colorSetId,
    colorSetVersion: artifact.colorSetVersion,
    groups,
    profiles,
  });
}
function copyProfile(
  profile: PublishedColorSetProfile,
): PublishedColorSetProfile {
  return Object.freeze({
    profileId: profile.profileId,
    size: profile.size,
    groups: Object.freeze([...profile.groups]),
    memberCodes: Object.freeze([...profile.memberCodes]),
  });
}
