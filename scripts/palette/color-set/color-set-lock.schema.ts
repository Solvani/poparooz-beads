import { z } from "zod";

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const lockedFileSchema = z
  .object({
    path: z.string().min(1),
    sha256: sha256Schema,
    byteLength: z.number().int().positive(),
  })
  .strict();

export const ColorSetLockSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    lockVersion: z.literal("1.0.0"),
    colorSetId: z.literal("poparooz-fixed-color-sets"),
    colorSetVersion: z.literal("1.0.0"),
    approvedHashes: z
      .object({
        sourceWorkbookSha256: sha256Schema,
        formalPaletteCanonicalSha256: sha256Schema,
        canonicalMembershipsSha256: sha256Schema,
        publishedProfileDefinitionsSha256: sha256Schema,
      })
      .strict(),
    inputs: z
      .object({
        sourceWorkbook: lockedFileSchema,
        normalizedPalette: lockedFileSchema,
        runtimePalette: lockedFileSchema,
      })
      .strict(),
    artifact: lockedFileSchema
      .extend({
        groupCounts: z.array(z.number().int().positive()).length(9),
        profileCounts: z.array(z.number().int().positive()).length(6),
        profileMembershipSha256: z.record(z.string(), sha256Schema),
      })
      .strict(),
  })
  .strict();

export type ColorSetLock = z.infer<typeof ColorSetLockSchema>;
