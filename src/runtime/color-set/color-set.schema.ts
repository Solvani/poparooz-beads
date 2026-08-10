import { z } from "zod";

import { POPAROOZ_COLOR_CODE_PATTERN } from "../../domain/color/poparooz-color-code";
import { ColorSetBrowserError } from "./color-set.errors";
import type { ColorSetArtifact } from "./color-set.types";

const profileIds = [
  "poparooz-set-24",
  "poparooz-set-48",
  "poparooz-set-72",
  "poparooz-set-120",
  "poparooz-set-168",
  "poparooz-set-221",
] as const;
const sizes = [24, 48, 72, 120, 168, 221] as const;
const codeSchema = z.string().regex(POPAROOZ_COLOR_CODE_PATTERN);
const artifactSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactVersion: z.literal("1.0.0"),
    colorSetId: z.literal("poparooz-fixed-color-sets"),
    colorSetVersion: z.literal("1.0.0"),
    groups: z
      .array(
        z
          .object({
            group: z.number().int().min(1).max(9),
            memberCodes: z.array(codeSchema),
          })
          .strict(),
      )
      .length(9),
    profiles: z
      .array(
        z
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
            groups: z.array(z.number().int().min(1).max(9)),
            memberCodes: z.array(codeSchema),
          })
          .strict(),
      )
      .length(6),
  })
  .strict()
  .superRefine((artifact, context) => {
    const allCodes = new Set<string>();
    artifact.groups.forEach((group, index) => {
      const expected = index === 8 ? 29 : 24;
      if (
        group.group !== index + 1 ||
        group.memberCodes.length !== expected ||
        new Set(group.memberCodes).size !== expected
      )
        context.addIssue({
          code: "custom",
          path: ["groups", index],
          message: "GROUP_INVALID",
        });
      group.memberCodes.forEach((code) => allCodes.add(code));
    });
    if (allCodes.size !== 221)
      context.addIssue({
        code: "custom",
        path: ["groups"],
        message: "GROUP_INVALID",
      });
    artifact.profiles.forEach((profile, index) => {
      if (
        profile.profileId !== profileIds[index] ||
        profile.size !== sizes[index] ||
        profile.memberCodes.length !== profile.size ||
        new Set(profile.memberCodes).size !== profile.size
      )
        context.addIssue({
          code: "custom",
          path: ["profiles", index],
          message: "PROFILE_INVALID",
        });
      const expectedMembers = new Set(
        artifact.groups
          .filter((group) => profile.groups.includes(group.group))
          .flatMap((group) => group.memberCodes),
      );
      if (
        expectedMembers.size !== profile.size ||
        profile.memberCodes.some((code) => !expectedMembers.has(code))
      )
        context.addIssue({
          code: "custom",
          path: ["profiles", index],
          message: "PROFILE_INVALID",
        });
    });
  });

export function parseColorSetArtifact(input: unknown): ColorSetArtifact {
  const result = artifactSchema.safeParse(input);
  if (!result.success)
    throw new ColorSetBrowserError("COLOR_SET_SCHEMA_INVALID");
  return result.data;
}
