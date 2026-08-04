import { z } from "zod";

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const repositoryPathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !/^[A-Za-z]:/.test(value) &&
      !value.split("/").includes(".."),
    "Path must be a repository-relative POSIX path.",
  );

const LockedRuntimeFileBaseSchema = z
  .object({
    path: repositoryPathSchema,
    sha256: sha256Schema,
    byteLength: z.number().int().positive(),
  })
  .strict();

const lockedRuntimeFileSchema = (lockedPath: string) =>
  LockedRuntimeFileBaseSchema.extend({ path: z.literal(lockedPath) }).strict();

export const RuntimePaletteLockSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    lockVersion: z.literal("1.0.0"),
    paletteId: z.literal("poparooz-standard"),
    paletteVersion: z.literal("1.0.0"),
    artifactVersion: z.literal("1.0.0"),
    referenceSystem: z.literal("POPAROOZ"),
    approvedFormalHashes: z
      .object({
        sourceSha256: sha256Schema,
        paletteCanonicalSha256: sha256Schema,
        derivationAuditSha256: sha256Schema,
      })
      .strict(),
    inputs: z
      .object({
        manifest: lockedRuntimeFileSchema(
          "data-source/palettes/poparooz-standard/1.0.0/manifest.json",
        ),
        normalizedPalette: lockedRuntimeFileSchema(
          "data-source/palettes/poparooz-standard/1.0.0/normalized-palette.json",
        ),
        colorDerivationAudit: lockedRuntimeFileSchema(
          "data-source/palettes/poparooz-standard/1.0.0/color-derivation-audit.json",
        ),
        paletteValidationReport: lockedRuntimeFileSchema(
          "data-source/palettes/poparooz-standard/1.0.0/palette-validation-report.json",
        ),
        runtimePolicy: lockedRuntimeFileSchema(
          "scripts/palette/runtime/policies/poparooz-standard.formal-1.0.0.runtime-1.0.0.json",
        ),
      })
      .strict(),
    runtimeArtifact: lockedRuntimeFileSchema(
      "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
    )
      .extend({
        recordCount: z.literal(221),
        activeCount: z.literal(221),
        autoMatchEligibleCount: z.literal(221),
      })
      .strict(),
  })
  .strict();

export type RuntimePaletteLock = z.infer<typeof RuntimePaletteLockSchema>;
