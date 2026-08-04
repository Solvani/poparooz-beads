import { createHash } from "node:crypto";
import path from "node:path";

import { RuntimePaletteArtifactSchema } from "./runtime-palette.schema.ts";
import { RuntimePaletteCompilationError } from "./runtime-palette-errors.ts";
import {
  compileRuntimePaletteFromInputBytes,
  nodeRuntimePaletteFileSystem,
  publishDeterministicRuntimeFile,
  type RuntimePaletteFileSystem,
  type RuntimePaletteInputBytes,
} from "./runtime-palette-io.ts";
import {
  RuntimePaletteLockSchema,
  type RuntimePaletteLock,
} from "./runtime-palette-lock.schema.ts";

export const RUNTIME_PALETTE_LOCK_RELATIVE_PATH =
  "data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.lock.json";

export const RUNTIME_PALETTE_LOCK_INPUT_PATHS = {
  manifest: "data-source/palettes/poparooz-standard/1.0.0/manifest.json",
  normalizedPalette:
    "data-source/palettes/poparooz-standard/1.0.0/normalized-palette.json",
  colorDerivationAudit:
    "data-source/palettes/poparooz-standard/1.0.0/color-derivation-audit.json",
  paletteValidationReport:
    "data-source/palettes/poparooz-standard/1.0.0/palette-validation-report.json",
  runtimePolicy:
    "scripts/palette/runtime/policies/poparooz-standard.formal-1.0.0.runtime-1.0.0.json",
  runtimeArtifact:
    "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
} as const;

const APPROVED_INPUT_SHA256 = {
  manifest: "97f836f762a2383fb2dc239321e1370d7c0da5b90d9ab2eaefbf1d64a23ef69a",
  normalizedPalette:
    "4b096a4e6d3d2ec4de85ab67e80ddf848f4def1498b497b951b5fa6b752fa89d",
  colorDerivationAudit:
    "f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020",
  paletteValidationReport:
    "2516401aa319ea461e7f94c406303037d925bfd66f8c3bfec7915ee039bbd167",
  runtimePolicy:
    "68eea50db5880b57076d756e5b3730ac6ce83df8dd5899a43c7825366f7f7e25",
  runtimeArtifact:
    "86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70",
} as const;

const APPROVED_FORMAL_HASHES = {
  sourceSha256:
    "5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e",
  paletteCanonicalSha256:
    "1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4",
  derivationAuditSha256:
    "f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020",
} as const;

export interface RuntimePaletteLockInputBytes extends RuntimePaletteInputBytes {
  readonly runtimeArtifact: Buffer;
}

export interface RuntimePaletteLockCompilation {
  readonly lock: RuntimePaletteLock;
  readonly bytes: string;
  readonly sha256: string;
}

export async function compileRuntimePaletteLockFromFiles(
  repositoryRoot: string,
  fileSystem: RuntimePaletteFileSystem = nodeRuntimePaletteFileSystem,
): Promise<RuntimePaletteLockCompilation> {
  const [
    manifest,
    normalizedPalette,
    derivationAudit,
    validationReport,
    policy,
    runtimeArtifact,
  ] = await Promise.all([
    readLockedInput(
      repositoryRoot,
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.manifest,
      fileSystem,
    ),
    readLockedInput(
      repositoryRoot,
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.normalizedPalette,
      fileSystem,
    ),
    readLockedInput(
      repositoryRoot,
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.colorDerivationAudit,
      fileSystem,
    ),
    readLockedInput(
      repositoryRoot,
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.paletteValidationReport,
      fileSystem,
    ),
    readLockedInput(
      repositoryRoot,
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.runtimePolicy,
      fileSystem,
    ),
    readLockedInput(
      repositoryRoot,
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.runtimeArtifact,
      fileSystem,
    ),
  ] as const);
  const inputs: RuntimePaletteLockInputBytes = {
    manifest,
    normalizedPalette,
    derivationAudit,
    validationReport,
    policy,
    runtimeArtifact,
  };
  return compileRuntimePaletteLock(inputs);
}

export function compileRuntimePaletteLock(
  inputs: RuntimePaletteLockInputBytes,
): RuntimePaletteLockCompilation {
  const actualHashes = {
    manifest: hashBytes(inputs.manifest),
    normalizedPalette: hashBytes(inputs.normalizedPalette),
    colorDerivationAudit: hashBytes(inputs.derivationAudit),
    paletteValidationReport: hashBytes(inputs.validationReport),
    runtimePolicy: hashBytes(inputs.policy),
    runtimeArtifact: hashBytes(inputs.runtimeArtifact),
  };
  for (const name of Object.keys(APPROVED_INPUT_SHA256) as Array<
    keyof typeof APPROVED_INPUT_SHA256
  >) {
    if (actualHashes[name] !== APPROVED_INPUT_SHA256[name]) {
      throw new RuntimePaletteCompilationError(
        "RUNTIME_LOCK_INPUT_INVALID",
        "A Runtime Lock input does not match its approved byte fingerprint.",
      );
    }
  }

  const runtimeCompilation = compileRuntimePaletteFromInputBytes(inputs);
  if (
    runtimeCompilation.sha256 !== APPROVED_INPUT_SHA256.runtimeArtifact ||
    !inputs.runtimeArtifact.equals(
      Buffer.from(runtimeCompilation.bytes, "utf8"),
    )
  ) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_ARTIFACT_MISMATCH",
      "The committed Runtime Artifact differs from deterministic recompilation.",
    );
  }
  const artifact = parseRuntimeArtifact(inputs.runtimeArtifact);
  const manifest = parseRecord(inputs.manifest, "Formal Palette Manifest");
  const report = parseRecord(
    inputs.validationReport,
    "Formal Palette validation report",
  );
  const approvedFormalHashes = {
    sourceSha256: readString(manifest, "sourceFileSha256"),
    paletteCanonicalSha256: readString(manifest, "canonicalRecordsSha256"),
    derivationAuditSha256: readString(report, "derivationAuditSha256"),
  };
  if (!sameJson(approvedFormalHashes, APPROVED_FORMAL_HASHES)) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INPUT_INVALID",
      "The approved Formal hashes do not match the frozen Runtime Lock contract.",
    );
  }

  const candidate = {
    schemaVersion: "1.0.0",
    lockVersion: "1.0.0",
    paletteId: artifact.paletteId,
    paletteVersion: artifact.paletteVersion,
    artifactVersion: artifact.artifactVersion,
    referenceSystem: artifact.referenceSystem,
    approvedFormalHashes,
    inputs: {
      manifest: lockedFile(
        RUNTIME_PALETTE_LOCK_INPUT_PATHS.manifest,
        inputs.manifest,
      ),
      normalizedPalette: lockedFile(
        RUNTIME_PALETTE_LOCK_INPUT_PATHS.normalizedPalette,
        inputs.normalizedPalette,
      ),
      colorDerivationAudit: lockedFile(
        RUNTIME_PALETTE_LOCK_INPUT_PATHS.colorDerivationAudit,
        inputs.derivationAudit,
      ),
      paletteValidationReport: lockedFile(
        RUNTIME_PALETTE_LOCK_INPUT_PATHS.paletteValidationReport,
        inputs.validationReport,
      ),
      runtimePolicy: lockedFile(
        RUNTIME_PALETTE_LOCK_INPUT_PATHS.runtimePolicy,
        inputs.policy,
      ),
    },
    runtimeArtifact: {
      ...lockedFile(
        RUNTIME_PALETTE_LOCK_INPUT_PATHS.runtimeArtifact,
        inputs.runtimeArtifact,
      ),
      recordCount: artifact.recordCount,
      activeCount: artifact.activeCount,
      autoMatchEligibleCount: artifact.autoMatchEligibleCount,
    },
  };
  const result = RuntimePaletteLockSchema.safeParse(candidate);
  if (!result.success) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INVALID",
      "The generated Runtime Palette Lock failed strict validation.",
      { cause: result.error },
    );
  }
  const bytes = `${JSON.stringify(result.data, null, 2)}\n`;
  return { lock: result.data, bytes, sha256: hashBytes(bytes) };
}

export async function publishRuntimePaletteLock(
  compilation: RuntimePaletteLockCompilation,
  outputPath: string,
  fileSystem: RuntimePaletteFileSystem = nodeRuntimePaletteFileSystem,
): Promise<{ readonly published: boolean }> {
  await assertLockDirectoryInventory(outputPath, fileSystem, false);
  const publication = await publishDeterministicRuntimeFile(
    compilation.bytes,
    outputPath,
    parseRuntimeLock,
    fileSystem,
  );
  await assertLockDirectoryInventory(outputPath, fileSystem, true);
  return publication;
}

export function parseRuntimeLock(bytes: string): RuntimePaletteLock {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes);
  } catch (error) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INVALID",
      "The Runtime Palette Lock is not valid JSON.",
      { cause: error },
    );
  }
  const result = RuntimePaletteLockSchema.safeParse(parsed);
  if (!result.success) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INVALID",
      "The Runtime Palette Lock failed strict validation.",
      { cause: result.error },
    );
  }
  return result.data;
}

function lockedFile(relativePath: string, bytes: Buffer) {
  return {
    path: relativePath,
    sha256: hashBytes(bytes),
    byteLength: bytes.byteLength,
  };
}

function parseRuntimeArtifact(bytes: Buffer) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_ARTIFACT_INVALID",
      "The committed Runtime Artifact is not valid JSON.",
      { cause: error },
    );
  }
  const result = RuntimePaletteArtifactSchema.safeParse(parsed);
  if (!result.success) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_ARTIFACT_INVALID",
      "The committed Runtime Artifact failed strict validation.",
      { cause: result.error },
    );
  }
  return result.data;
}

function parseRecord(bytes: Buffer, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INPUT_INVALID",
      `${label} is not valid JSON.`,
      { cause: error },
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INPUT_INVALID",
      `${label} must be an object.`,
    );
  }
  return parsed as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INPUT_INVALID",
      "A required approved Formal hash is missing.",
    );
  }
  return value;
}

async function readLockedInput(
  repositoryRoot: string,
  relativePath: string,
  fileSystem: RuntimePaletteFileSystem,
): Promise<Buffer> {
  try {
    return await fileSystem.readFile(path.join(repositoryRoot, relativePath));
  } catch (error) {
    throw new RuntimePaletteCompilationError(
      "INPUT_READ_FAILED",
      "A required Runtime Lock input could not be read.",
      { cause: error },
    );
  }
}

async function assertLockDirectoryInventory(
  outputPath: string,
  fileSystem: RuntimePaletteFileSystem,
  requireLock: boolean,
): Promise<void> {
  let entries: readonly string[];
  try {
    entries = await fileSystem.readdir(path.dirname(outputPath));
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT") && !requireLock) return;
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INVALID",
      "The Runtime Lock directory inventory could not be verified.",
      { cause: error },
    );
  }
  const expected = requireLock ? [path.basename(outputPath)] : [];
  if (
    entries.length !== expected.length ||
    entries.some((entry, index) => entry !== expected[index])
  ) {
    if (
      !requireLock &&
      entries.length === 1 &&
      entries[0] === path.basename(outputPath)
    ) {
      return;
    }
    throw new RuntimePaletteCompilationError(
      "RUNTIME_LOCK_INVALID",
      "The Runtime Lock directory contains an unexpected file.",
    );
  }
}

function hashBytes(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
