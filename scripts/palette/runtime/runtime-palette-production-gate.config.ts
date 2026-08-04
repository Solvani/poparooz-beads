import { z } from "zod";

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
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

export const RuntimePaletteProductionGateConfigSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    paletteId: z.literal("poparooz-standard"),
    paletteVersion: z.literal("1.0.0"),
    artifactVersion: z.literal("1.0.0"),
    referenceSystem: z.literal("POPAROOZ"),
    runtimeLockPath: repositoryPathSchema.pipe(
      z.literal(
        "data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.lock.json",
      ),
    ),
    runtimeLockSha256: sha256Schema.pipe(
      z.literal(
        "36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648",
      ),
    ),
    runtimeArtifactPath: repositoryPathSchema.pipe(
      z.literal(
        "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
      ),
    ),
    runtimeArtifactSha256: sha256Schema.pipe(
      z.literal(
        "86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70",
      ),
    ),
    approvedFormalHashes: z
      .object({
        sourceSha256: sha256Schema.pipe(
          z.literal(
            "5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e",
          ),
        ),
        paletteCanonicalSha256: sha256Schema.pipe(
          z.literal(
            "1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4",
          ),
        ),
        derivationAuditSha256: sha256Schema.pipe(
          z.literal(
            "f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020",
          ),
        ),
      })
      .strict(),
    recordCount: z.literal(221),
    activeCount: z.literal(221),
    autoMatchEligibleCount: z.literal(221),
  })
  .strict();

export type RuntimePaletteProductionGateConfig = z.infer<
  typeof RuntimePaletteProductionGateConfigSchema
>;

export const runtimePaletteProductionGateConfig = Object.freeze({
  schemaVersion: "1.0.0",
  paletteId: "poparooz-standard",
  paletteVersion: "1.0.0",
  artifactVersion: "1.0.0",
  referenceSystem: "POPAROOZ",
  runtimeLockPath:
    "data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.lock.json",
  runtimeLockSha256:
    "36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648",
  runtimeArtifactPath:
    "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
  runtimeArtifactSha256:
    "86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70",
  approvedFormalHashes: Object.freeze({
    sourceSha256:
      "5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e",
    paletteCanonicalSha256:
      "1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4",
    derivationAuditSha256:
      "f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020",
  }),
  recordCount: 221,
  activeCount: 221,
  autoMatchEligibleCount: 221,
} as const satisfies RuntimePaletteProductionGateConfig);
