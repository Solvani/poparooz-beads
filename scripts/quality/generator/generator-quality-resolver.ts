import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type {
  GeneratorQualityCorpusManifest,
  GeneratorQualityInputDeclaration,
} from "./generator-quality.types.ts";

export interface ResolvedExternalCorpusInput {
  readonly logicalId: string;
  readonly sha256: string;
  readonly bytes: Buffer;
}

export async function resolveExternalCorpus(
  manifest: GeneratorQualityCorpusManifest,
  rootDirectory: string,
): Promise<readonly ResolvedExternalCorpusInput[]> {
  const root = path.resolve(rootDirectory);
  const declarationByLogicalId = externalDeclarations(manifest);
  if (declarationByLogicalId.size === 0) {
    throw new Error("The manifest declares no external corpus inputs.");
  }

  const actualLogicalIds = await listFiles(root);
  const declaredLogicalIds = [...declarationByLogicalId.keys()].sort();
  if (
    actualLogicalIds.length !== declaredLogicalIds.length ||
    actualLogicalIds.some((item, index) => item !== declaredLogicalIds[index])
  ) {
    throw new Error(
      "The external corpus directory does not exactly match the manifest.",
    );
  }

  const resolved: ResolvedExternalCorpusInput[] = [];
  for (const logicalId of declaredLogicalIds) {
    const declaration = declarationByLogicalId.get(logicalId)!;
    const filePath = safeResolve(root, logicalId);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("An external corpus input is not a regular file.");
    }
    const bytes = await readFile(filePath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== declaration.sha256) {
      throw new Error("An external corpus input SHA-256 does not match.");
    }
    resolved.push(Object.freeze({ logicalId, sha256, bytes }));
  }
  return Object.freeze(resolved);
}

function externalDeclarations(
  manifest: GeneratorQualityCorpusManifest,
): Map<string, GeneratorQualityInputDeclaration> {
  const result = new Map<string, GeneratorQualityInputDeclaration>();
  for (const item of manifest.cases) {
    if (item.sourceKind === "synthetic") continue;
    add(item.input);
    if (item.reference.type === "trusted-alpha-pair") {
      add(item.reference.input);
    }
  }
  return result;

  function add(input: GeneratorQualityInputDeclaration): void {
    if (result.has(input.logicalId)) {
      throw new Error("Duplicate external corpus logical input id.");
    }
    safeLogicalId(input.logicalId);
    result.set(input.logicalId, input);
  }
}

function safeResolve(root: string, logicalId: string): string {
  safeLogicalId(logicalId);
  const candidate = path.resolve(root, ...logicalId.split("/"));
  const relative = path.relative(root, candidate);
  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    throw new Error("External corpus logical id escapes the configured root.");
  }
  return candidate;
}

function safeLogicalId(logicalId: string): void {
  if (
    logicalId.includes("\\") ||
    logicalId
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error("External corpus logical id is unsafe.");
  }
}

async function listFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  await walk(root, "");
  return result.sort();

  async function walk(
    directory: string,
    relativeDirectory: string,
  ): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const relative = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute, relative);
      else if (entry.isFile()) result.push(relative);
      else
        throw new Error("External corpus contains an unsupported entry type.");
    }
  }
}
