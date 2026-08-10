import { z } from "zod";

import { POPAROOZ_COLOR_CODE_PATTERN } from "../../../src/domain/color/poparooz-color-code.ts";

const codeSchema = z.string().regex(POPAROOZ_COLOR_CODE_PATTERN);
const groupNumberSchema = z.number().int().min(1).max(9);

export const ColorSetGroupSchema = z
  .object({
    group: groupNumberSchema,
    memberCodes: z.array(codeSchema),
  })
  .strict();

export const ColorSetProfileSchema = z
  .object({
    profileId: z.enum([
      "poparooz-set-24",
      "poparooz-set-48",
      "poparooz-set-72",
      "poparooz-set-120",
      "poparooz-set-168",
      "poparooz-set-221",
    ]),
    size: z.union([
      z.literal(24),
      z.literal(48),
      z.literal(72),
      z.literal(120),
      z.literal(168),
      z.literal(221),
    ]),
    groups: z.array(groupNumberSchema),
    memberCodes: z.array(codeSchema),
  })
  .strict();

export const ColorSetArtifactSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactVersion: z.literal("1.0.0"),
    colorSetId: z.literal("poparooz-fixed-color-sets"),
    colorSetVersion: z.literal("1.0.0"),
    groups: z.array(ColorSetGroupSchema).length(9),
    profiles: z.array(ColorSetProfileSchema).length(6),
  })
  .strict()
  .superRefine((artifact, context) => {
    artifact.groups.forEach((group, index) => {
      if (group.group !== index + 1) {
        context.addIssue({
          code: "custom",
          path: ["groups", index],
          message: "GROUP_ORDER",
        });
      }
      const expected = group.group === 9 ? 29 : 24;
      if (
        group.memberCodes.length !== expected ||
        new Set(group.memberCodes).size !== expected
      ) {
        context.addIssue({
          code: "custom",
          path: ["groups", index, "memberCodes"],
          message: "GROUP_COUNT",
        });
      }
    });
    const allCodes = artifact.groups.flatMap((group) => group.memberCodes);
    if (allCodes.length !== 221 || new Set(allCodes).size !== 221) {
      context.addIssue({
        code: "custom",
        path: ["groups"],
        message: "MEMBERSHIP_COUNT",
      });
    }
    const expectedSizes = [24, 48, 72, 120, 168, 221];
    artifact.profiles.forEach((profile, index) => {
      if (
        profile.size !== expectedSizes[index] ||
        profile.memberCodes.length !== profile.size
      ) {
        context.addIssue({
          code: "custom",
          path: ["profiles", index],
          message: "PROFILE_COUNT",
        });
      }
      if (new Set(profile.memberCodes).size !== profile.memberCodes.length) {
        context.addIssue({
          code: "custom",
          path: ["profiles", index, "memberCodes"],
          message: "PROFILE_DUPLICATE",
        });
      }
    });
  });

export type ColorSetArtifact = z.infer<typeof ColorSetArtifactSchema>;
