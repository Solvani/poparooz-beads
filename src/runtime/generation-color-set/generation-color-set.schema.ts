import { z } from "zod";

import { POPAROOZ_COLOR_CODE_PATTERN } from "../../domain/color/poparooz-color-code";
import { GenerationColorSetError } from "./generation-color-set.errors";
import type { GenerationColorSetSnapshot } from "./generation-color-set.types";

const profileIds = [
  "poparooz-set-24",
  "poparooz-set-48",
  "poparooz-set-72",
  "poparooz-set-120",
  "poparooz-set-168",
  "poparooz-set-221",
] as const;
const sizes = [24, 48, 72, 120, 168, 221] as const;
const profileSchema = z
  .object({
    profileId: z.enum(profileIds),
    size: z.union([
      z.literal(24),
      z.literal(48),
      z.literal(72),
      z.literal(120),
      z.literal(168),
      z.literal(221),
    ]),
    memberCodes: z.array(z.string().regex(POPAROOZ_COLOR_CODE_PATTERN)),
  })
  .strict();
const snapshotSchema = z
  .object({
    identity: z
      .object({
        schemaVersion: z.literal("1.0.0"),
        artifactVersion: z.literal("1.0.0"),
        colorSetId: z.literal("poparooz-fixed-color-sets"),
        colorSetVersion: z.literal("1.0.0"),
      })
      .strict(),
    profiles: z.array(profileSchema).length(6),
  })
  .strict()
  .superRefine((snapshot, context) => {
    snapshot.profiles.forEach((profile, index) => {
      if (
        profile.profileId !== profileIds[index] ||
        profile.size !== sizes[index] ||
        profile.memberCodes.length !== profile.size ||
        new Set(profile.memberCodes).size !== profile.size
      ) {
        context.addIssue({
          code: "custom",
          path: ["profiles", index],
          message: "PROFILE_INVALID",
        });
      }
    });
  });

export function parseGenerationColorSetSnapshot(
  input: unknown,
): GenerationColorSetSnapshot {
  const result = snapshotSchema.safeParse(input);
  if (!result.success) {
    throw new GenerationColorSetError("GENERATION_COLOR_SET_OUTPUT_INVALID");
  }
  return result.data;
}
