import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  RuntimePaletteCompilationError,
  type RuntimePaletteErrorCode,
} from "./runtime-palette-errors.ts";
import { compileRuntimePaletteFromInputBytes } from "./runtime-palette-io.ts";
import {
  hashRuntimePaletteBytes,
  parseRuntimeLock,
} from "./runtime-palette-lock.ts";
import { RuntimePaletteArtifactSchema } from "./runtime-palette.schema.ts";
import {
  RuntimePaletteProductionGateConfigSchema,
  runtimePaletteProductionGateConfig,
  type RuntimePaletteProductionGateConfig,
} from "./runtime-palette-production-gate.config.ts";

interface ProductionGateDirectoryEntry {
  readonly name: string;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

interface ProductionGateStat {
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface RuntimePaletteProductionGateFileSystem {
  readFile(filePath: string): Promise<Buffer>;
  lstat(filePath: string): Promise<ProductionGateStat>;
  readdir(
    directoryPath: string,
    options: { withFileTypes: true },
  ): Promise<readonly ProductionGateDirectoryEntry[]>;
}

export const nodeRuntimePaletteProductionGateFileSystem: RuntimePaletteProductionGateFileSystem =
  { readFile, lstat, readdir };

export interface RuntimePaletteProductionGateResult {
  readonly paletteId: "poparooz-standard";
  readonly paletteVersion: "1.0.0";
  readonly artifactVersion: "1.0.0";
  readonly runtimeLockSha256: string;
  readonly runtimeArtifactSha256: string;
  readonly recordCount: 221;
  readonly activeCount: 221;
  readonly autoMatchEligibleCount: 221;
  readonly verified: true;
}

export async function verifyRuntimePaletteProductionGate(
  repositoryRoot: string,
  config: unknown = runtimePaletteProductionGateConfig,
  fileSystem: RuntimePaletteProductionGateFileSystem = nodeRuntimePaletteProductionGateFileSystem,
): Promise<RuntimePaletteProductionGateResult> {
  const approval = parseApprovalConfig(config);
  const lockBytes = await readRegularRepositoryFile(
    repositoryRoot,
    approval.runtimeLockPath,
    "RUNTIME_PRODUCTION_LOCK_MISSING",
    fileSystem,
  );
  if (hashRuntimePaletteBytes(lockBytes) !== approval.runtimeLockSha256) {
    fail(
      "RUNTIME_PRODUCTION_LOCK_HASH_MISMATCH",
      "The Runtime Lock bytes do not match the approved fingerprint.",
    );
  }

  let lock;
  try {
    lock = parseRuntimeLock(lockBytes.toString("utf8"));
  } catch (error) {
    fail(
      "RUNTIME_PRODUCTION_LOCK_INVALID",
      "The approved Runtime Lock failed strict validation.",
      error,
    );
  }
  if (
    lock.paletteId !== approval.paletteId ||
    lock.paletteVersion !== approval.paletteVersion ||
    lock.artifactVersion !== approval.artifactVersion ||
    lock.referenceSystem !== approval.referenceSystem ||
    lock.runtimeArtifact.path !== approval.runtimeArtifactPath ||
    lock.runtimeArtifact.sha256 !== approval.runtimeArtifactSha256 ||
    !sameJson(lock.approvedFormalHashes, approval.approvedFormalHashes) ||
    lock.runtimeArtifact.recordCount !== approval.recordCount ||
    lock.runtimeArtifact.activeCount !== approval.activeCount ||
    lock.runtimeArtifact.autoMatchEligibleCount !==
      approval.autoMatchEligibleCount
  ) {
    fail(
      "RUNTIME_PRODUCTION_LOCK_INVALID",
      "The Runtime Lock does not match the approved Production Gate identity.",
    );
  }

  const inputs = {
    manifest: await readLockedInput(
      repositoryRoot,
      lock.inputs.manifest,
      fileSystem,
    ),
    normalizedPalette: await readLockedInput(
      repositoryRoot,
      lock.inputs.normalizedPalette,
      fileSystem,
    ),
    derivationAudit: await readLockedInput(
      repositoryRoot,
      lock.inputs.colorDerivationAudit,
      fileSystem,
    ),
    validationReport: await readLockedInput(
      repositoryRoot,
      lock.inputs.paletteValidationReport,
      fileSystem,
    ),
    policy: await readLockedInput(
      repositoryRoot,
      lock.inputs.runtimePolicy,
      fileSystem,
    ),
  };

  let recompilation;
  try {
    recompilation = compileRuntimePaletteFromInputBytes(inputs);
  } catch (error) {
    fail(
      "RUNTIME_PRODUCTION_INPUT_HASH_MISMATCH",
      "A locked input failed strict Runtime business validation.",
      error,
    );
  }

  const artifactBytes = await readRegularRepositoryFile(
    repositoryRoot,
    approval.runtimeArtifactPath,
    "RUNTIME_PRODUCTION_ARTIFACT_MISSING",
    fileSystem,
  );
  if (
    artifactBytes.byteLength !== lock.runtimeArtifact.byteLength ||
    hashRuntimePaletteBytes(artifactBytes) !== approval.runtimeArtifactSha256
  ) {
    fail(
      "RUNTIME_PRODUCTION_ARTIFACT_HASH_MISMATCH",
      "The Runtime Artifact bytes do not match the approved fingerprint.",
    );
  }
  const artifact = parseArtifact(artifactBytes);
  if (
    artifact.paletteId !== approval.paletteId ||
    artifact.paletteVersion !== approval.paletteVersion ||
    artifact.artifactVersion !== approval.artifactVersion ||
    artifact.referenceSystem !== approval.referenceSystem ||
    artifact.recordCount !== approval.recordCount ||
    artifact.activeCount !== approval.activeCount ||
    artifact.autoMatchEligibleCount !== approval.autoMatchEligibleCount
  ) {
    fail(
      "RUNTIME_PRODUCTION_ARTIFACT_INVALID",
      "The Runtime Artifact identity does not match Production approval.",
    );
  }
  if (
    recompilation.sha256 !== approval.runtimeArtifactSha256 ||
    !artifactBytes.equals(Buffer.from(recompilation.bytes, "utf8"))
  ) {
    fail(
      "RUNTIME_PRODUCTION_ARTIFACT_RECOMPILE_MISMATCH",
      "The Runtime Artifact differs from deterministic in-memory recompilation.",
    );
  }

  await assertExactDirectoryInventory(
    repositoryRoot,
    path.posix.dirname(approval.runtimeArtifactPath),
    ["file:runtime-palette.json"],
    fileSystem,
  );
  await assertExactDirectoryInventory(
    repositoryRoot,
    path.posix.dirname(approval.runtimeLockPath),
    ["file:runtime-palette.lock.json"],
    fileSystem,
  );
  return {
    paletteId: approval.paletteId,
    paletteVersion: approval.paletteVersion,
    artifactVersion: approval.artifactVersion,
    runtimeLockSha256: approval.runtimeLockSha256,
    runtimeArtifactSha256: approval.runtimeArtifactSha256,
    recordCount: approval.recordCount,
    activeCount: approval.activeCount,
    autoMatchEligibleCount: approval.autoMatchEligibleCount,
    verified: true,
  };
}

function parseApprovalConfig(
  config: unknown,
): RuntimePaletteProductionGateConfig {
  const result = RuntimePaletteProductionGateConfigSchema.safeParse(config);
  if (!result.success) {
    fail(
      "RUNTIME_PRODUCTION_GATE_CONFIG_INVALID",
      "The Runtime Production Gate approval configuration is invalid.",
      result.error,
    );
  }
  return result.data;
}

async function readLockedInput(
  repositoryRoot: string,
  locked: {
    readonly path: string;
    readonly sha256: string;
    readonly byteLength: number;
  },
  fileSystem: RuntimePaletteProductionGateFileSystem,
): Promise<Buffer> {
  const bytes = await readRegularRepositoryFile(
    repositoryRoot,
    locked.path,
    "RUNTIME_PRODUCTION_INPUT_MISSING",
    fileSystem,
  );
  if (bytes.byteLength !== locked.byteLength) {
    fail(
      "RUNTIME_PRODUCTION_INPUT_LENGTH_MISMATCH",
      `Locked input ${locked.path} has an unexpected byte length.`,
    );
  }
  if (hashRuntimePaletteBytes(bytes) !== locked.sha256) {
    fail(
      "RUNTIME_PRODUCTION_INPUT_HASH_MISMATCH",
      `Locked input ${locked.path} has an unexpected fingerprint.`,
    );
  }
  return bytes;
}

async function readRegularRepositoryFile(
  repositoryRoot: string,
  relativePath: string,
  missingCode:
    | "RUNTIME_PRODUCTION_LOCK_MISSING"
    | "RUNTIME_PRODUCTION_INPUT_MISSING"
    | "RUNTIME_PRODUCTION_ARTIFACT_MISSING",
  fileSystem: RuntimePaletteProductionGateFileSystem,
): Promise<Buffer> {
  const absolutePath = resolveRepositoryPath(repositoryRoot, relativePath);
  await assertNoSymlinkDirectories(
    repositoryRoot,
    path.posix.dirname(relativePath),
    fileSystem,
  );
  let fileStat: ProductionGateStat;
  try {
    fileStat = await fileSystem.lstat(absolutePath);
  } catch (error) {
    fail(missingCode, `Required file ${relativePath} is missing.`, error);
  }
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    fail(
      "RUNTIME_PRODUCTION_PATH_INVALID",
      `Required path ${relativePath} is not a regular repository file.`,
    );
  }
  try {
    return await fileSystem.readFile(absolutePath);
  } catch (error) {
    fail(missingCode, `Required file ${relativePath} cannot be read.`, error);
  }
}

function resolveRepositoryPath(
  repositoryRoot: string,
  relativePath: string,
): string {
  if (
    relativePath.length === 0 ||
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    /^[A-Za-z]:/.test(relativePath) ||
    relativePath.split("/").includes("..")
  ) {
    fail(
      "RUNTIME_PRODUCTION_PATH_INVALID",
      "A Production Gate path is not repository-relative POSIX form.",
    );
  }
  const root = path.resolve(repositoryRoot);
  const resolved = path.resolve(root, ...relativePath.split("/"));
  const fromRoot = path.relative(root, resolved);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    fail(
      "RUNTIME_PRODUCTION_PATH_INVALID",
      "A Production Gate path escapes the repository root.",
    );
  }
  return resolved;
}

function parseArtifact(bytes: Buffer) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail(
      "RUNTIME_PRODUCTION_ARTIFACT_INVALID",
      "The Runtime Artifact is not valid JSON.",
      error,
    );
  }
  const result = RuntimePaletteArtifactSchema.safeParse(parsed);
  if (!result.success) {
    fail(
      "RUNTIME_PRODUCTION_ARTIFACT_INVALID",
      "The Runtime Artifact failed strict validation.",
      result.error,
    );
  }
  return result.data;
}

async function assertExactDirectoryInventory(
  repositoryRoot: string,
  relativeDirectory: string,
  expected: readonly string[],
  fileSystem: RuntimePaletteProductionGateFileSystem,
): Promise<void> {
  const absoluteDirectory = resolveRepositoryPath(
    repositoryRoot,
    relativeDirectory,
  );
  await assertNoSymlinkDirectories(
    repositoryRoot,
    relativeDirectory,
    fileSystem,
  );
  const actual = await collectInventory(absoluteDirectory, fileSystem);
  if (!sameJson(actual.sort(), [...expected].sort())) {
    fail(
      "RUNTIME_PRODUCTION_INVENTORY_INVALID",
      `Directory ${relativeDirectory} has an unexpected inventory.`,
    );
  }
}

async function assertNoSymlinkDirectories(
  repositoryRoot: string,
  relativeDirectory: string,
  fileSystem: RuntimePaletteProductionGateFileSystem,
): Promise<void> {
  let current = path.resolve(repositoryRoot);
  const parts = relativeDirectory === "." ? [] : relativeDirectory.split("/");
  for (const part of ["", ...parts]) {
    if (part !== "") current = path.join(current, part);
    let directoryStat: ProductionGateStat;
    try {
      directoryStat = await fileSystem.lstat(current);
    } catch (error) {
      fail(
        "RUNTIME_PRODUCTION_PATH_INVALID",
        "A required Production Gate directory is missing.",
        error,
      );
    }
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
      fail(
        "RUNTIME_PRODUCTION_PATH_INVALID",
        "A Production Gate path contains a non-directory or symbolic link.",
      );
    }
  }
}

async function collectInventory(
  absoluteDirectory: string,
  fileSystem: RuntimePaletteProductionGateFileSystem,
): Promise<string[]> {
  let entries: readonly ProductionGateDirectoryEntry[];
  try {
    entries = await fileSystem.readdir(absoluteDirectory, {
      withFileTypes: true,
    });
  } catch (error) {
    fail(
      "RUNTIME_PRODUCTION_INVENTORY_INVALID",
      "A required directory inventory cannot be read.",
      error,
    );
  }
  const inventory: string[] = [];
  for (const entry of entries) {
    const relativePath = entry.name;
    if (entry.isSymbolicLink()) {
      fail(
        "RUNTIME_PRODUCTION_INVENTORY_INVALID",
        "A Production Gate inventory contains a symbolic link.",
      );
    }
    if (entry.isFile()) {
      inventory.push(`file:${relativePath}`);
    } else if (entry.isDirectory()) {
      inventory.push(`directory:${relativePath}`);
    } else {
      fail(
        "RUNTIME_PRODUCTION_INVENTORY_INVALID",
        "A Production Gate inventory contains a non-file entry.",
      );
    }
  }
  return inventory;
}

function fail(
  code: RuntimePaletteErrorCode,
  message: string,
  cause?: unknown,
): never {
  throw new RuntimePaletteCompilationError(code, message, { cause });
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
