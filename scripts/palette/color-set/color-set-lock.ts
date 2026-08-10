import { readFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";

import { ColorSetCompilationError } from "./color-set-errors.ts";
import {
  COLOR_SET_CANONICAL_MEMBERSHIPS_SHA256,
  COLOR_SET_PUBLISHED_DEFINITIONS_SHA256,
  COLOR_SET_SOURCE_SHA256,
  FORMAL_PALETTE_CANONICAL_SHA256,
  hashBytes,
} from "./color-set-compiler.ts";
import {
  COLOR_SET_INPUT_PATHS,
  compileColorSetProfilesFromFiles,
  parseColorSetArtifactBytes,
  publishDeterministicColorSetFile,
} from "./color-set-io.ts";
import {
  ColorSetLockSchema,
  type ColorSetLock,
} from "./color-set-lock.schema.ts";

export const COLOR_SET_LOCK_RELATIVE_PATH =
  "data-source/runtime-locks/poparooz-fixed-color-sets/1.0.0/color-set-profiles.lock.json";

export interface ColorSetLockCompilation {
  readonly lock: ColorSetLock;
  readonly bytes: string;
  readonly sha256: string;
}

export async function compileColorSetLockFromFiles(
  repositoryRoot: string,
): Promise<ColorSetLockCompilation> {
  const compilation = await compileColorSetProfilesFromFiles(repositoryRoot);
  const [sourceWorkbook, normalizedPalette, runtimePalette, artifact] =
    await Promise.all([
      readFile(path.join(repositoryRoot, COLOR_SET_INPUT_PATHS.source)),
      readFile(
        path.join(repositoryRoot, COLOR_SET_INPUT_PATHS.normalizedPalette),
      ),
      readFile(path.join(repositoryRoot, COLOR_SET_INPUT_PATHS.runtimePalette)),
      readFile(path.join(repositoryRoot, COLOR_SET_INPUT_PATHS.artifact)),
    ]);
  if (!artifact.equals(Buffer.from(compilation.bytes, "utf8")))
    throw new ColorSetCompilationError(
      "COLOR_SET_LOCK_INVALID",
      "Committed Color Set Artifact differs from deterministic recompilation.",
    );
  parseColorSetArtifactBytes(artifact.toString("utf8"));
  const lockCandidate = {
    schemaVersion: "1.0.0",
    lockVersion: "1.0.0",
    colorSetId: "poparooz-fixed-color-sets",
    colorSetVersion: "1.0.0",
    approvedHashes: {
      sourceWorkbookSha256: COLOR_SET_SOURCE_SHA256,
      formalPaletteCanonicalSha256: FORMAL_PALETTE_CANONICAL_SHA256,
      canonicalMembershipsSha256: COLOR_SET_CANONICAL_MEMBERSHIPS_SHA256,
      publishedProfileDefinitionsSha256: COLOR_SET_PUBLISHED_DEFINITIONS_SHA256,
    },
    inputs: {
      sourceWorkbook: locked(COLOR_SET_INPUT_PATHS.source, sourceWorkbook),
      normalizedPalette: locked(
        COLOR_SET_INPUT_PATHS.normalizedPalette,
        normalizedPalette,
      ),
      runtimePalette: locked(
        COLOR_SET_INPUT_PATHS.runtimePalette,
        runtimePalette,
      ),
    },
    artifact: {
      ...locked(COLOR_SET_INPUT_PATHS.artifact, artifact),
      groupCounts: [...compilation.groupCounts],
      profileCounts: compilation.artifact.profiles.map(
        (profile) => profile.size,
      ),
      profileMembershipSha256: { ...compilation.profileMembershipSha256 },
    },
  };
  const parsed = ColorSetLockSchema.safeParse(lockCandidate);
  if (!parsed.success)
    throw new ColorSetCompilationError(
      "COLOR_SET_LOCK_INVALID",
      "Generated Color Set Lock failed strict validation.",
      { cause: parsed.error },
    );
  const bytes = await format(JSON.stringify(parsed.data), { parser: "json" });
  return Object.freeze({ lock: parsed.data, bytes, sha256: hashBytes(bytes) });
}

export async function publishColorSetLock(
  compilation: ColorSetLockCompilation,
  outputPath: string,
) {
  return publishDeterministicColorSetFile(
    compilation.bytes,
    outputPath,
    parseColorSetLockBytes,
  );
}
export function parseColorSetLockBytes(bytes: string): ColorSetLock {
  let input: unknown;
  try {
    input = JSON.parse(bytes);
  } catch (error) {
    throw new ColorSetCompilationError(
      "COLOR_SET_LOCK_INVALID",
      "Color Set Lock is not valid JSON.",
      { cause: error },
    );
  }
  const result = ColorSetLockSchema.safeParse(input);
  if (!result.success)
    throw new ColorSetCompilationError(
      "COLOR_SET_LOCK_INVALID",
      "Color Set Lock failed strict validation.",
      { cause: result.error },
    );
  return result.data;
}
function locked(relativePath: string, bytes: Buffer) {
  return {
    path: relativePath,
    sha256: hashBytes(bytes),
    byteLength: bytes.byteLength,
  };
}
