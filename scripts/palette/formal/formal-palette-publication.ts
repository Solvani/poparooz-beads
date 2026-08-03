import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  FormalPaletteCompilationError,
  isFormalPaletteCompilationError,
  type FormalPaletteCompilationErrorCode,
} from "./formal-palette-errors.ts";
import { hashSourceFileBytes } from "./formal-palette-canonical.ts";
import {
  compileFormalPaletteWorkbookBytes,
  FORMAL_PALETTE_ARTIFACT_NAMES,
  FORMAL_PALETTE_SOURCE_FILE_NAME,
  FORMAL_PALETTE_SOURCE_SHA256,
  type FormalPaletteCompilation,
} from "./formal-palette-xlsx-compiler.ts";

interface FileSystemDirectoryEntry {
  readonly name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

interface FileSystemStat {
  readonly size: number;
}

export interface FormalPaletteFileSystem {
  readFile(filePath: string): Promise<Buffer>;
  writeFile(filePath: string, contents: string): Promise<void>;
  copyFile(sourcePath: string, destinationPath: string): Promise<void>;
  mkdir(
    directoryPath: string,
    options?: { recursive?: boolean },
  ): Promise<void>;
  rename(sourcePath: string, destinationPath: string): Promise<void>;
  rm(
    directoryPath: string,
    options: { recursive: true; force: boolean },
  ): Promise<void>;
  stat(filePath: string): Promise<FileSystemStat>;
  readdir(
    directoryPath: string,
    options: { withFileTypes: true },
  ): Promise<readonly FileSystemDirectoryEntry[]>;
}

export const nodeFormalPaletteFileSystem: FormalPaletteFileSystem = {
  readFile,
  async writeFile(filePath, contents) {
    await writeFile(filePath, contents, "utf8");
  },
  copyFile,
  async mkdir(directoryPath, options) {
    await mkdir(directoryPath, options);
  },
  rename,
  rm,
  stat,
  readdir,
};

export const FORMAL_PALETTE_PACKAGE_INVENTORY = [
  `source/${FORMAL_PALETTE_SOURCE_FILE_NAME}`,
  ...FORMAL_PALETTE_ARTIFACT_NAMES,
] as const;

export interface FormalPalettePublicationResult extends FormalPaletteCompilation {
  readonly incomingRetained: boolean;
  readonly incomingMatchesFormalSource?: true;
}

export async function publishFormalPaletteCompilation(
  incomingSourcePath: string,
  outputDirectory: string,
  fileSystem: FormalPaletteFileSystem = nodeFormalPaletteFileSystem,
): Promise<FormalPalettePublicationResult> {
  const stagingDirectory = `${outputDirectory}.compile-tmp`;
  const incomingExists = await pathExists(incomingSourcePath, fileSystem);
  const formalExists = await pathExists(outputDirectory, fileSystem);
  const stagingExists = await pathExists(stagingDirectory, fileSystem);

  if (!incomingExists && !formalExists && stagingExists) {
    await validateRecoverySource(stagingDirectory, fileSystem);
    throw new FormalPaletteCompilationError(
      "PUBLICATION_RECOVERY_REQUIRED",
      "A staged source exists without an incoming or formal package; safe recovery is required.",
    );
  }

  if (!incomingExists && !formalExists) {
    throw new FormalPaletteCompilationError(
      "SOURCE_NOT_FOUND",
      "The approved formal Palette source workbook was not found.",
    );
  }

  if (formalExists) {
    const compilation = await verifyFormalPalettePackage(
      outputDirectory,
      fileSystem,
    );
    if (stagingExists) {
      await removeStaging(stagingDirectory, fileSystem);
    }
    if (incomingExists) {
      const incomingBytes = await readSource(incomingSourcePath, fileSystem);
      if (hashSourceFileBytes(incomingBytes) !== FORMAL_PALETTE_SOURCE_SHA256) {
        throw new FormalPaletteCompilationError(
          "SOURCE_INPUT_CONFLICT",
          "The incoming source does not match the approved formal source.",
        );
      }
    }
    return publicationResult(compilation, incomingExists);
  }

  const sourceBytes = await readSource(incomingSourcePath, fileSystem);
  const compilation = await compileFormalPaletteWorkbookBytes(sourceBytes);
  if (stagingExists) {
    await removeStaging(stagingDirectory, fileSystem);
  }

  let published = false;
  try {
    await operation(
      "STAGING_WRITE_FAILED",
      "The staging directory could not be created.",
      () => fileSystem.mkdir(stagingDirectory, { recursive: true }),
    );
    for (const name of FORMAL_PALETTE_ARTIFACT_NAMES) {
      await operation(
        "STAGING_WRITE_FAILED",
        `The staged artifact ${name} could not be written.`,
        () =>
          fileSystem.writeFile(
            path.join(stagingDirectory, name),
            compilation.artifacts[name],
          ),
      );
    }
    const stagingSourceDirectory = path.join(stagingDirectory, "source");
    await operation(
      "STAGING_WRITE_FAILED",
      "The staged source directory could not be created.",
      () => fileSystem.mkdir(stagingSourceDirectory),
    );
    await operation(
      "STAGING_WRITE_FAILED",
      "The source workbook could not be copied into staging.",
      () =>
        fileSystem.copyFile(
          incomingSourcePath,
          path.join(stagingSourceDirectory, FORMAL_PALETTE_SOURCE_FILE_NAME),
        ),
    );
    await verifyPackageAgainstCompilation(
      stagingDirectory,
      sourceBytes,
      compilation,
      "STAGING_VERIFICATION_FAILED",
      fileSystem,
    );
    await operation(
      "PUBLICATION_FAILED",
      "The formal package parent directory could not be prepared.",
      () =>
        fileSystem.mkdir(path.dirname(outputDirectory), { recursive: true }),
    );
    await operation(
      "PUBLICATION_FAILED",
      "The staged formal package could not be published.",
      () => fileSystem.rename(stagingDirectory, outputDirectory),
    );
    published = true;
    await verifyPackageAgainstCompilation(
      outputDirectory,
      sourceBytes,
      compilation,
      "PUBLICATION_FAILED",
      fileSystem,
    );
  } catch (primaryError) {
    if (!published) {
      const recoveryErrors = await recoverFailedPublicationStaging(
        stagingDirectory,
        fileSystem,
      );
      if (recoveryErrors.length > 0) {
        throw new FormalPaletteCompilationError(
          "STAGING_STATE_INVALID",
          "Publication failed and staging recovery was incomplete.",
          { cause: new AggregateError([primaryError, ...recoveryErrors]) },
        );
      }
    }
    throw primaryError;
  }

  return publicationResult(compilation, true);
}

export async function verifyFormalPalettePackage(
  outputDirectory: string,
  fileSystem: FormalPaletteFileSystem = nodeFormalPaletteFileSystem,
): Promise<FormalPaletteCompilation> {
  await assertPackageInventory(
    outputDirectory,
    "FORMAL_PACKAGE_CONTENT_MISMATCH",
    fileSystem,
  );
  const sourcePath = path.join(
    outputDirectory,
    "source",
    FORMAL_PALETTE_SOURCE_FILE_NAME,
  );
  let sourceBytes: Buffer;
  try {
    sourceBytes = await fileSystem.readFile(sourcePath);
  } catch (error) {
    throw new FormalPaletteCompilationError(
      "FORMAL_PACKAGE_CONTENT_MISMATCH",
      "The formal package source workbook is missing or unreadable.",
      { cause: error },
    );
  }
  const compilation = await compileFormalPaletteWorkbookBytes(sourceBytes);
  await verifyPackageAgainstCompilation(
    outputDirectory,
    sourceBytes,
    compilation,
    "FORMAL_PACKAGE_CONTENT_MISMATCH",
    fileSystem,
  );
  return compilation;
}

async function verifyPackageAgainstCompilation(
  packageDirectory: string,
  sourceBytes: Uint8Array,
  compilation: FormalPaletteCompilation,
  contentErrorCode:
    | "STAGING_VERIFICATION_FAILED"
    | "PUBLICATION_FAILED"
    | "FORMAL_PACKAGE_CONTENT_MISMATCH",
  fileSystem: FormalPaletteFileSystem,
): Promise<void> {
  await assertPackageInventory(packageDirectory, contentErrorCode, fileSystem);

  const packageSource = await readPackageFile(
    path.join(packageDirectory, "source", FORMAL_PALETTE_SOURCE_FILE_NAME),
    contentErrorCode,
    fileSystem,
  );
  if (
    hashSourceFileBytes(packageSource) !== FORMAL_PALETTE_SOURCE_SHA256 ||
    !Buffer.from(packageSource).equals(Buffer.from(sourceBytes))
  ) {
    throw new FormalPaletteCompilationError(
      contentErrorCode,
      "The formal package source workbook does not match the approved source bytes.",
    );
  }
  for (const name of FORMAL_PALETTE_ARTIFACT_NAMES) {
    const actual = await readPackageFile(
      path.join(packageDirectory, name),
      contentErrorCode,
      fileSystem,
    );
    if (!actual.equals(Buffer.from(compilation.artifacts[name], "utf8"))) {
      throw new FormalPaletteCompilationError(
        contentErrorCode,
        `The formal package artifact ${name} differs from deterministic recompilation.`,
      );
    }
  }
}

async function assertPackageInventory(
  packageDirectory: string,
  contentErrorCode:
    | "STAGING_VERIFICATION_FAILED"
    | "PUBLICATION_FAILED"
    | "FORMAL_PACKAGE_CONTENT_MISMATCH",
  fileSystem: FormalPaletteFileSystem,
): Promise<void> {
  const actualInventory = await collectInventory(
    packageDirectory,
    fileSystem,
    contentErrorCode,
  );
  const expectedInventory = [
    "directory:source",
    ...FORMAL_PALETTE_PACKAGE_INVENTORY.map((name) => `file:${name}`),
  ].sort();
  if (!arraysEqual(actualInventory, expectedInventory)) {
    throw new FormalPaletteCompilationError(
      contentErrorCode === "FORMAL_PACKAGE_CONTENT_MISMATCH"
        ? "FORMAL_PACKAGE_INVENTORY_MISMATCH"
        : contentErrorCode,
      "The formal package file inventory does not match the approved inventory.",
    );
  }
}

async function collectInventory(
  directoryPath: string,
  fileSystem: FormalPaletteFileSystem,
  contentErrorCode:
    | "STAGING_VERIFICATION_FAILED"
    | "PUBLICATION_FAILED"
    | "FORMAL_PACKAGE_CONTENT_MISMATCH",
  relativePath = "",
): Promise<string[]> {
  let entries: readonly FileSystemDirectoryEntry[];
  try {
    entries = await fileSystem.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    throw new FormalPaletteCompilationError(
      contentErrorCode === "FORMAL_PACKAGE_CONTENT_MISMATCH"
        ? "FORMAL_PACKAGE_INVENTORY_MISMATCH"
        : contentErrorCode,
      "The formal package inventory could not be read.",
      { cause: error },
    );
  }
  const inventory: string[] = [];
  for (const entry of entries) {
    const childRelative = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;
    if (entry.isDirectory()) {
      inventory.push(`directory:${childRelative}`);
      inventory.push(
        ...(await collectInventory(
          path.join(directoryPath, entry.name),
          fileSystem,
          contentErrorCode,
          childRelative,
        )),
      );
    } else if (entry.isFile()) {
      inventory.push(`file:${childRelative}`);
    } else {
      inventory.push(`unknown:${childRelative}`);
    }
  }
  return inventory.sort();
}

async function validateRecoverySource(
  stagingDirectory: string,
  fileSystem: FormalPaletteFileSystem,
): Promise<void> {
  const stagedSourcePath = path.join(
    stagingDirectory,
    "source",
    FORMAL_PALETTE_SOURCE_FILE_NAME,
  );
  let bytes: Buffer;
  try {
    bytes = await fileSystem.readFile(stagedSourcePath);
  } catch (error) {
    throw new FormalPaletteCompilationError(
      "STAGING_STATE_INVALID",
      "The orphaned staging directory does not contain a readable approved source.",
      { cause: error },
    );
  }
  if (hashSourceFileBytes(bytes) !== FORMAL_PALETTE_SOURCE_SHA256) {
    throw new FormalPaletteCompilationError(
      "STAGING_STATE_INVALID",
      "The orphaned staging source does not match the approved source hash.",
    );
  }
}

async function readSource(
  sourcePath: string,
  fileSystem: FormalPaletteFileSystem,
): Promise<Buffer> {
  try {
    return await fileSystem.readFile(sourcePath);
  } catch (error) {
    throw new FormalPaletteCompilationError(
      "SOURCE_NOT_FOUND",
      "The approved formal Palette source workbook could not be read.",
      { cause: error },
    );
  }
}

async function readPackageFile(
  filePath: string,
  code:
    | "STAGING_VERIFICATION_FAILED"
    | "PUBLICATION_FAILED"
    | "FORMAL_PACKAGE_CONTENT_MISMATCH",
  fileSystem: FormalPaletteFileSystem,
): Promise<Buffer> {
  try {
    return await fileSystem.readFile(filePath);
  } catch (error) {
    throw new FormalPaletteCompilationError(
      code,
      "A formal package file is missing or unreadable.",
      { cause: error },
    );
  }
}

function publicationResult(
  compilation: FormalPaletteCompilation,
  incomingRetained: boolean,
): FormalPalettePublicationResult {
  return {
    ...compilation,
    incomingRetained,
    ...(incomingRetained ? { incomingMatchesFormalSource: true as const } : {}),
  };
}

async function recoverFailedPublicationStaging(
  stagingDirectory: string,
  fileSystem: FormalPaletteFileSystem,
): Promise<unknown[]> {
  const recoveryErrors: unknown[] = [];
  let shouldCleanup = false;
  try {
    shouldCleanup = await pathExists(stagingDirectory, fileSystem);
  } catch (error) {
    recoveryErrors.push(error);
    shouldCleanup = true;
  }
  if (shouldCleanup) {
    try {
      await fileSystem.rm(stagingDirectory, { recursive: true, force: true });
    } catch (error) {
      recoveryErrors.push(error);
    }
  }
  return recoveryErrors;
}

async function removeStaging(
  stagingDirectory: string,
  fileSystem: FormalPaletteFileSystem,
): Promise<void> {
  try {
    await fileSystem.rm(stagingDirectory, { recursive: true, force: false });
  } catch (error) {
    throw new FormalPaletteCompilationError(
      "STAGING_STATE_INVALID",
      "The stale staging directory could not be safely removed.",
      { cause: error },
    );
  }
}

async function operation<T>(
  code: FormalPaletteCompilationErrorCode,
  message: string,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isFormalPaletteCompilationError(error)) throw error;
    throw new FormalPaletteCompilationError(code, message, { cause: error });
  }
}

async function pathExists(
  filePath: string,
  fileSystem: FormalPaletteFileSystem,
): Promise<boolean> {
  try {
    await fileSystem.stat(filePath);
    return true;
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) return false;
    throw new FormalPaletteCompilationError(
      "STAGING_STATE_INVALID",
      "The publication state could not be inspected safely.",
      { cause: error },
    );
  }
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
