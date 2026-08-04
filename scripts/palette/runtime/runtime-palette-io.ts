import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { RuntimePaletteArtifactSchema } from "./runtime-palette.schema.ts";
import {
  compileRuntimePalette,
  type RuntimePaletteCompilation,
  type RuntimePaletteCompilerInput,
} from "./runtime-palette-compiler.ts";
import { RuntimePaletteCompilationError } from "./runtime-palette-errors.ts";

const FORMAL_INPUT_NAMES = [
  "manifest.json",
  "normalized-palette.json",
  "color-derivation-audit.json",
  "palette-validation-report.json",
] as const;

export interface RuntimePaletteFileSystem {
  readFile(filePath: string): Promise<Buffer>;
  writeFile(
    filePath: string,
    contents: string,
    options: { encoding: "utf8"; flag: "wx" },
  ): Promise<void>;
  mkdir(directoryPath: string, options: { recursive: true }): Promise<void>;
  rename(sourcePath: string, destinationPath: string): Promise<void>;
  rm(filePath: string, options: { force: boolean }): Promise<void>;
  stat(filePath: string): Promise<unknown>;
  readdir(directoryPath: string): Promise<readonly string[]>;
}

export const nodeRuntimePaletteFileSystem: RuntimePaletteFileSystem = {
  readFile,
  async writeFile(filePath, contents, options) {
    await writeFile(filePath, contents, options);
  },
  async mkdir(directoryPath, options) {
    await mkdir(directoryPath, options);
  },
  rename,
  rm,
  stat,
  readdir,
};

export interface RuntimePaletteInputBytes {
  readonly manifest: Buffer;
  readonly normalizedPalette: Buffer;
  readonly derivationAudit: Buffer;
  readonly validationReport: Buffer;
  readonly policy: Buffer;
}

export async function compileRuntimePaletteFromFiles(
  formalDirectory: string,
  policyPath: string,
  fileSystem: RuntimePaletteFileSystem = nodeRuntimePaletteFileSystem,
): Promise<RuntimePaletteCompilation> {
  const [manifestBytes, normalizedBytes, auditBytes, reportBytes, policyBytes] =
    await Promise.all([
      readInput(path.join(formalDirectory, FORMAL_INPUT_NAMES[0]), fileSystem),
      readInput(path.join(formalDirectory, FORMAL_INPUT_NAMES[1]), fileSystem),
      readInput(path.join(formalDirectory, FORMAL_INPUT_NAMES[2]), fileSystem),
      readInput(path.join(formalDirectory, FORMAL_INPUT_NAMES[3]), fileSystem),
      readInput(policyPath, fileSystem),
    ] as const);
  return compileRuntimePaletteFromInputBytes({
    manifest: manifestBytes,
    normalizedPalette: normalizedBytes,
    derivationAudit: auditBytes,
    validationReport: reportBytes,
    policy: policyBytes,
  });
}

export function compileRuntimePaletteFromInputBytes(
  bytes: RuntimePaletteInputBytes,
): RuntimePaletteCompilation {
  const input: RuntimePaletteCompilerInput = {
    manifest: parseJson(bytes.manifest, "Formal Palette Manifest"),
    normalizedPalette: parseJson(
      bytes.normalizedPalette,
      "normalized Formal Palette",
    ),
    derivationAudit: parseJson(bytes.derivationAudit, "color derivation audit"),
    derivationAuditBytes: bytes.derivationAudit.toString("utf8"),
    validationReport: parseJson(
      bytes.validationReport,
      "Palette validation report",
    ),
    policy: parseJson(bytes.policy, "Runtime Palette policy"),
  };
  return compileRuntimePalette(input);
}

export async function publishRuntimePaletteArtifact(
  compilation: RuntimePaletteCompilation,
  outputPath: string,
  fileSystem: RuntimePaletteFileSystem = nodeRuntimePaletteFileSystem,
): Promise<{ readonly published: boolean }> {
  verifyCompilation(compilation);
  return publishDeterministicRuntimeFile(
    compilation.bytes,
    outputPath,
    parseAndValidateArtifact,
    fileSystem,
  );
}

export async function publishDeterministicRuntimeFile(
  bytes: string,
  outputPath: string,
  validateBytes: (bytes: string) => unknown,
  fileSystem: RuntimePaletteFileSystem = nodeRuntimePaletteFileSystem,
): Promise<{ readonly published: boolean }> {
  validateBytes(bytes);
  if (await pathExists(outputPath, fileSystem)) {
    const existing = await readPublicationFile(outputPath, fileSystem);
    if (existing.equals(Buffer.from(bytes, "utf8"))) {
      return { published: false };
    }
    throw new RuntimePaletteCompilationError(
      "PUBLICATION_CONFLICT",
      "An existing Runtime data file differs from deterministic generation.",
    );
  }

  const stagingPath = `${outputPath}.compile-tmp`;
  if (await pathExists(stagingPath, fileSystem)) {
    throw new RuntimePaletteCompilationError(
      "PUBLICATION_CONFLICT",
      "A Runtime Palette staging file already exists and requires review.",
    );
  }

  let stagingCreated = false;
  let outputCreated = false;
  try {
    await fileSystem.mkdir(path.dirname(outputPath), { recursive: true });
    await fileSystem.writeFile(stagingPath, bytes, {
      encoding: "utf8",
      flag: "wx",
    });
    stagingCreated = true;
    const staged = await readPublicationFile(stagingPath, fileSystem);
    if (!staged.equals(Buffer.from(bytes, "utf8"))) {
      throw new RuntimePaletteCompilationError(
        "PUBLICATION_FAILED",
        "The staged Runtime data bytes failed verification.",
      );
    }
    validateBytes(staged.toString("utf8"));
    await fileSystem.rename(stagingPath, outputPath);
    stagingCreated = false;
    outputCreated = true;
    const published = await readPublicationFile(outputPath, fileSystem);
    if (!published.equals(Buffer.from(bytes, "utf8"))) {
      throw new RuntimePaletteCompilationError(
        "PUBLICATION_FAILED",
        "The published Runtime data bytes failed verification.",
      );
    }
    validateBytes(published.toString("utf8"));
    outputCreated = false;
    return { published: true };
  } catch (primaryError) {
    const cleanupErrors: unknown[] = [];
    for (const cleanupPath of [
      ...(stagingCreated ? [stagingPath] : []),
      ...(outputCreated ? [outputPath] : []),
    ]) {
      try {
        await fileSystem.rm(cleanupPath, { force: true });
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new RuntimePaletteCompilationError(
        "PUBLICATION_FAILED",
        "Runtime data publication and cleanup both failed.",
        { cause: new AggregateError([primaryError, ...cleanupErrors]) },
      );
    }
    if (primaryError instanceof RuntimePaletteCompilationError) {
      throw primaryError;
    }
    throw new RuntimePaletteCompilationError(
      "PUBLICATION_FAILED",
      "The Runtime data file could not be published safely.",
      { cause: primaryError },
    );
  }
}

async function readPublicationFile(
  filePath: string,
  fileSystem: RuntimePaletteFileSystem,
): Promise<Buffer> {
  try {
    return await fileSystem.readFile(filePath);
  } catch (error) {
    throw new RuntimePaletteCompilationError(
      "PUBLICATION_FAILED",
      "A Runtime publication file could not be read.",
      { cause: error },
    );
  }
}

function verifyCompilation(compilation: RuntimePaletteCompilation): void {
  const parsed = parseAndValidateArtifact(compilation.bytes);
  if (JSON.stringify(parsed) !== JSON.stringify(compilation.artifact)) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_ARTIFACT_INVALID",
      "The Runtime Palette bytes and in-memory Artifact differ.",
    );
  }
}

function parseAndValidateArtifact(bytes: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes);
  } catch (error) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_ARTIFACT_INVALID",
      "The Runtime Palette Artifact is not valid JSON.",
      { cause: error },
    );
  }
  const result = RuntimePaletteArtifactSchema.safeParse(parsed);
  if (!result.success) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_ARTIFACT_INVALID",
      "The Runtime Palette Artifact failed strict validation.",
      { cause: result.error },
    );
  }
  return result.data;
}

async function readInput(
  filePath: string,
  fileSystem: RuntimePaletteFileSystem,
): Promise<Buffer> {
  try {
    return await fileSystem.readFile(filePath);
  } catch (error) {
    throw new RuntimePaletteCompilationError(
      "INPUT_READ_FAILED",
      "A required Runtime Palette compiler input could not be read.",
      { cause: error },
    );
  }
}

function parseJson(bytes: Buffer, label: string): unknown {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new RuntimePaletteCompilationError(
      "INPUT_JSON_INVALID",
      `${label} is not valid JSON.`,
      { cause: error },
    );
  }
}

async function pathExists(
  filePath: string,
  fileSystem: RuntimePaletteFileSystem,
): Promise<boolean> {
  try {
    await fileSystem.stat(filePath);
    return true;
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) return false;
    throw new RuntimePaletteCompilationError(
      "PUBLICATION_FAILED",
      "The Runtime Palette publication state could not be inspected.",
      { cause: error },
    );
  }
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
