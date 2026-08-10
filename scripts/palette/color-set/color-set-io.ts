import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { ColorSetCompilationError } from "./color-set-errors.ts";
import {
  compileColorSetProfiles,
  type ColorSetCompilation,
} from "./color-set-compiler.ts";
import { ColorSetArtifactSchema } from "./color-set.schema.ts";

export const COLOR_SET_INPUT_PATHS = {
  source: "data-source/color-sets/Poparooz色卡-套装明细.xlsx",
  normalizedPalette:
    "data-source/palettes/poparooz-standard/1.0.0/normalized-palette.json",
  runtimePalette:
    "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
  artifact:
    "src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json",
} as const;

export async function compileColorSetProfilesFromFiles(
  repositoryRoot: string,
): Promise<ColorSetCompilation> {
  try {
    const [sourceBytes, formalBytes, runtimeBytes] = await Promise.all([
      readFile(path.join(repositoryRoot, COLOR_SET_INPUT_PATHS.source)),
      readFile(
        path.join(repositoryRoot, COLOR_SET_INPUT_PATHS.normalizedPalette),
      ),
      readFile(path.join(repositoryRoot, COLOR_SET_INPUT_PATHS.runtimePalette)),
    ]);
    return await compileColorSetProfiles({
      sourceBytes,
      normalizedPalette: JSON.parse(formalBytes.toString("utf8")) as unknown,
      runtimePalette: JSON.parse(runtimeBytes.toString("utf8")) as unknown,
    });
  } catch (error) {
    if (error instanceof ColorSetCompilationError) throw error;
    throw new ColorSetCompilationError(
      "COLOR_SET_INPUT_INVALID",
      "Required Color Set inputs could not be compiled.",
      { cause: error },
    );
  }
}

export async function publishColorSetArtifact(
  compilation: ColorSetCompilation,
  outputPath: string,
): Promise<{ readonly published: boolean }> {
  return publishDeterministicColorSetFile(
    compilation.bytes,
    outputPath,
    parseColorSetArtifactBytes,
  );
}

export async function publishDeterministicColorSetFile(
  bytes: string,
  outputPath: string,
  validate: (value: string) => unknown,
): Promise<{ readonly published: boolean }> {
  validate(bytes);
  if (await exists(outputPath)) {
    const current = await readFile(outputPath);
    if (current.equals(Buffer.from(bytes, "utf8"))) return { published: false };
    throw new ColorSetCompilationError(
      "COLOR_SET_PUBLICATION_CONFLICT",
      "An existing Color Set output differs from deterministic generation.",
    );
  }
  const temporaryPath = `${outputPath}.compile-tmp`;
  if (await exists(temporaryPath))
    throw new ColorSetCompilationError(
      "COLOR_SET_PUBLICATION_CONFLICT",
      "A Color Set staging file already exists.",
    );
  let temporaryCreated = false;
  let outputCreated = false;
  try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(temporaryPath, bytes, { encoding: "utf8", flag: "wx" });
    temporaryCreated = true;
    validate(await readFile(temporaryPath, "utf8"));
    await rename(temporaryPath, outputPath);
    temporaryCreated = false;
    outputCreated = true;
    const published = await readFile(outputPath, "utf8");
    if (published !== bytes) throw new Error("Published bytes differ.");
    validate(published);
    outputCreated = false;
    return { published: true };
  } catch (error) {
    if (temporaryCreated) await rm(temporaryPath, { force: true });
    if (outputCreated) await rm(outputPath, { force: true });
    if (error instanceof ColorSetCompilationError) throw error;
    throw new ColorSetCompilationError(
      "COLOR_SET_PUBLICATION_FAILED",
      "Color Set output could not be published atomically.",
      { cause: error },
    );
  }
}

export function parseColorSetArtifactBytes(bytes: string) {
  let input: unknown;
  try {
    input = JSON.parse(bytes);
  } catch (error) {
    throw new ColorSetCompilationError(
      "COLOR_SET_ARTIFACT_INVALID",
      "Color Set Artifact is not valid JSON.",
      { cause: error },
    );
  }
  const result = ColorSetArtifactSchema.safeParse(input);
  if (!result.success)
    throw new ColorSetCompilationError(
      "COLOR_SET_ARTIFACT_INVALID",
      "Color Set Artifact failed strict validation.",
      { cause: result.error },
    );
  return result.data;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return false;
    throw error;
  }
}
function isNodeError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
