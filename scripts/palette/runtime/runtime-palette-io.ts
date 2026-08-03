import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
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
};

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
  const input: RuntimePaletteCompilerInput = {
    manifest: parseJson(manifestBytes, "Formal Palette Manifest"),
    normalizedPalette: parseJson(normalizedBytes, "normalized Formal Palette"),
    derivationAudit: parseJson(auditBytes, "color derivation audit"),
    derivationAuditBytes: auditBytes.toString("utf8"),
    validationReport: parseJson(reportBytes, "Palette validation report"),
    policy: parseJson(policyBytes, "Runtime Palette policy"),
  };
  return compileRuntimePalette(input);
}

export async function publishRuntimePaletteArtifact(
  compilation: RuntimePaletteCompilation,
  outputPath: string,
  fileSystem: RuntimePaletteFileSystem = nodeRuntimePaletteFileSystem,
): Promise<{ readonly published: boolean }> {
  verifyCompilation(compilation);
  if (await pathExists(outputPath, fileSystem)) {
    const existing = await readInput(outputPath, fileSystem);
    if (existing.equals(Buffer.from(compilation.bytes, "utf8"))) {
      return { published: false };
    }
    throw new RuntimePaletteCompilationError(
      "PUBLICATION_CONFLICT",
      "An existing Runtime Palette Artifact differs from deterministic compilation.",
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
  try {
    await fileSystem.mkdir(path.dirname(outputPath), { recursive: true });
    await fileSystem.writeFile(stagingPath, compilation.bytes, {
      encoding: "utf8",
      flag: "wx",
    });
    stagingCreated = true;
    const staged = await readInput(stagingPath, fileSystem);
    if (!staged.equals(Buffer.from(compilation.bytes, "utf8"))) {
      throw new RuntimePaletteCompilationError(
        "PUBLICATION_FAILED",
        "The staged Runtime Palette bytes failed verification.",
      );
    }
    parseAndValidateArtifact(staged.toString("utf8"));
    await fileSystem.rename(stagingPath, outputPath);
    stagingCreated = false;
    return { published: true };
  } catch (primaryError) {
    if (stagingCreated) {
      try {
        await fileSystem.rm(stagingPath, { force: true });
      } catch (cleanupError) {
        throw new RuntimePaletteCompilationError(
          "PUBLICATION_FAILED",
          "Runtime Palette publication and staging cleanup both failed.",
          { cause: new AggregateError([primaryError, cleanupError]) },
        );
      }
    }
    if (primaryError instanceof RuntimePaletteCompilationError) {
      throw primaryError;
    }
    throw new RuntimePaletteCompilationError(
      "PUBLICATION_FAILED",
      "The Runtime Palette Artifact could not be published safely.",
      { cause: primaryError },
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
