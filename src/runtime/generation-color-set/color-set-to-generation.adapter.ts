import { parseColorSetArtifact } from "../color-set/color-set.schema";
import type { ColorSetSnapshot } from "../color-set/color-set.types";
import { GenerationColorSetError } from "./generation-color-set.errors";
import { parseGenerationColorSetSnapshot } from "./generation-color-set.schema";
import type {
  GenerationColorSetProfile,
  GenerationColorSetSnapshot,
} from "./generation-color-set.types";

export function adaptColorSetToGeneration(
  input: ColorSetSnapshot,
): GenerationColorSetSnapshot {
  try {
    const source = parseColorSetArtifact(input);
    const candidate = parseGenerationColorSetSnapshot({
      identity: {
        schemaVersion: source.schemaVersion,
        artifactVersion: source.artifactVersion,
        colorSetId: source.colorSetId,
        colorSetVersion: source.colorSetVersion,
      },
      profiles: source.profiles.map((profile) => ({
        profileId: profile.profileId,
        size: profile.size,
        memberCodes: [...profile.memberCodes],
      })),
    });
    const profiles = Object.freeze(
      candidate.profiles.map((profile): GenerationColorSetProfile =>
        Object.freeze({
          profileId: profile.profileId,
          size: profile.size,
          memberCodes: Object.freeze([...profile.memberCodes]),
        }),
      ),
    );
    return Object.freeze({
      identity: Object.freeze({
        schemaVersion: candidate.identity.schemaVersion,
        artifactVersion: candidate.identity.artifactVersion,
        colorSetId: candidate.identity.colorSetId,
        colorSetVersion: candidate.identity.colorSetVersion,
      }),
      profiles,
    });
  } catch (error) {
    throw new GenerationColorSetError("GENERATION_COLOR_SET_INPUT_INVALID", {
      cause: error,
    });
  }
}

export function selectGenerationColorSetProfile(
  snapshot: GenerationColorSetSnapshot,
  profileId: string,
): GenerationColorSetProfile {
  const profile = snapshot.profiles.find(
    (candidate) => candidate.profileId === profileId,
  );
  if (profile === undefined)
    throw new GenerationColorSetError("GENERATION_COLOR_SET_PROFILE_INVALID");
  return profile;
}
