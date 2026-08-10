import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { ColorSetCompilationError } from "./color-set-errors.ts";
import { hashBytes } from "./color-set-compiler.ts";
import {
  compileColorSetProfilesFromFiles,
  parseColorSetArtifactBytes,
} from "./color-set-io.ts";
import { parseColorSetLockBytes } from "./color-set-lock.ts";
import { colorSetProductionGateConfig } from "./color-set-production-gate.config.ts";

export interface ColorSetProductionGateResult {
  readonly colorSetId: "poparooz-fixed-color-sets";
  readonly colorSetVersion: "1.0.0";
  readonly lockSha256: string;
  readonly artifactSha256: string;
  readonly groupCounts: readonly number[];
  readonly profileCounts: readonly number[];
  readonly verified: true;
}

export async function verifyColorSetProductionGate(
  repositoryRoot: string,
): Promise<ColorSetProductionGateResult> {
  try {
    const config = colorSetProductionGateConfig;
    const lockBytes = await readRegular(repositoryRoot, config.lockPath);
    if (hashBytes(lockBytes) !== config.lockSha256)
      fail("Approved Color Set Lock fingerprint mismatch.");
    const lock = parseColorSetLockBytes(lockBytes.toString("utf8"));
    const expectedInputs = [
      lock.inputs.sourceWorkbook,
      lock.inputs.normalizedPalette,
      lock.inputs.runtimePalette,
    ];
    for (const locked of expectedInputs) {
      const bytes = await readRegular(repositoryRoot, locked.path);
      if (
        bytes.byteLength !== locked.byteLength ||
        hashBytes(bytes) !== locked.sha256
      )
        fail("A locked Color Set input fingerprint mismatch.");
    }
    const compilation = await compileColorSetProfilesFromFiles(repositoryRoot);
    const artifactBytes = await readRegular(
      repositoryRoot,
      config.artifactPath,
    );
    if (
      artifactBytes.byteLength !== config.artifactByteLength ||
      hashBytes(artifactBytes) !== config.artifactSha256 ||
      !artifactBytes.equals(Buffer.from(compilation.bytes, "utf8"))
    )
      fail(
        "Color Set Artifact differs from deterministic approved compilation.",
      );
    const artifact = parseColorSetArtifactBytes(artifactBytes.toString("utf8"));
    if (
      lock.artifact.sha256 !== config.artifactSha256 ||
      lock.artifact.byteLength !== config.artifactByteLength ||
      JSON.stringify(lock.artifact.groupCounts) !==
        JSON.stringify(compilation.groupCounts) ||
      JSON.stringify(lock.artifact.profileCounts) !==
        JSON.stringify(config.profileCounts) ||
      artifact.profiles.some(
        (profile, index) => profile.size !== config.profileCounts[index],
      )
    )
      fail("Color Set Lock and Artifact identity mismatch.");
    await assertInventory(
      repositoryRoot,
      path.posix.dirname(config.artifactPath),
      ["color-set-profiles.json"],
    );
    await assertInventory(repositoryRoot, path.posix.dirname(config.lockPath), [
      "color-set-profiles.lock.json",
    ]);
    return Object.freeze({
      colorSetId: config.colorSetId,
      colorSetVersion: config.colorSetVersion,
      lockSha256: config.lockSha256,
      artifactSha256: config.artifactSha256,
      groupCounts: Object.freeze([...compilation.groupCounts]),
      profileCounts: Object.freeze([...config.profileCounts]),
      verified: true,
    });
  } catch (error) {
    if (
      error instanceof ColorSetCompilationError &&
      error.code === "COLOR_SET_PRODUCTION_GATE_FAILED"
    )
      throw error;
    throw new ColorSetCompilationError(
      "COLOR_SET_PRODUCTION_GATE_FAILED",
      "Color Set Production Gate failed closed.",
      { cause: error },
    );
  }
}

async function readRegular(
  root: string,
  relativePath: string,
): Promise<Buffer> {
  const absolute = resolvePath(root, relativePath);
  const stats = await lstat(absolute);
  if (!stats.isFile() || stats.isSymbolicLink())
    fail("A Color Set gate path is not a regular file.");
  return readFile(absolute);
}
async function assertInventory(
  root: string,
  relativeDirectory: string,
  expected: readonly string[],
): Promise<void> {
  const entries = await readdir(resolvePath(root, relativeDirectory), {
    withFileTypes: true,
  });
  if (
    entries.some((entry) => !entry.isFile() || entry.isSymbolicLink()) ||
    JSON.stringify(entries.map((entry) => entry.name).sort()) !==
      JSON.stringify([...expected].sort())
  )
    fail("Color Set gate directory inventory mismatch.");
}
function resolvePath(root: string, relativePath: string): string {
  if (
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    relativePath.split("/").includes("..")
  )
    fail("Color Set gate path is invalid.");
  const resolved = path.resolve(root, ...relativePath.split("/"));
  if (path.relative(path.resolve(root), resolved).startsWith(".."))
    fail("Color Set gate path escapes repository root.");
  return resolved;
}
function fail(message: string): never {
  throw new ColorSetCompilationError(
    "COLOR_SET_PRODUCTION_GATE_FAILED",
    message,
  );
}
