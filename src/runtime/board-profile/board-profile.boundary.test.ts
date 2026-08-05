// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const boardProfileRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(boardProfileRoot, "../..");
const approvedEntry = path.join(boardProfileRoot, "approved-board-profile.ts");
const approvedArtifact = path.join(
  boardProfileRoot,
  "artifacts",
  "poparooz-board-104",
  "1.0.0",
  "board-profile.json",
);

describe("Approved BoardProfile production boundary", () => {
  it("contains one browser-safe approved Artifact and no candidate input", async () => {
    const graph = await collectDependencyGraph(approvedEntry);
    expect(graph.externalSpecifiers).toEqual(["zod"]);
    expect(graph.files.filter((file) => file.endsWith(".json"))).toEqual([
      approvedArtifact,
    ]);
    for (const file of graph.files) {
      expect(file.startsWith(boardProfileRoot)).toBe(true);
      expect(file).not.toMatch(
        /fixture|benchmark|candidate|evidence|docs?[\\/]|data-source|scripts|manifest|lock|hash/i,
      );
    }
  });

  it("contains no Node, network, storage, Worker, registry, or fallback behavior", async () => {
    const graph = await collectDependencyGraph(approvedEntry);
    for (const file of graph.files.filter((candidate) =>
      candidate.endsWith(".ts"),
    )) {
      const source = await readFile(file, "utf8");
      expect(source, file).not.toMatch(
        /node:|fetch\(|XMLHttpRequest|localStorage|indexedDB|document\.cookie|new Worker|registry|fallback|board-profile\.fixture|BENCHMARK_BOARD_PROFILE/i,
      );
    }
  });

  it("keeps Provider, Artifact, Legacy schema, and fixtures out of Pattern and UI", async () => {
    const patternFiles = await productionSourceFiles(
      path.join(sourceRoot, "domain", "pattern"),
    );
    for (const file of patternFiles) {
      const source = await readFile(file, "utf8");
      expect(source, file).not.toMatch(
        /approved-board-profile|board-profile\.provider|board-profile\.json|domain[\\/]board[\\/]board-profile\.(?:schema|fixture)|BENCHMARK_BOARD_PROFILE/i,
      );
    }

    const uiFiles = [
      ...(await productionSourceFiles(path.join(sourceRoot, "app"))),
      ...(await productionSourceFiles(path.join(sourceRoot, "features"))),
    ];
    for (const file of uiFiles) {
      const source = await readFile(file, "utf8");
      expect(source, file).not.toMatch(
        /runtime[\\/]board-profile[\\/](?:approved-board-profile|board-profile\.provider|artifacts)/i,
      );
    }
  });

  it("keeps the approved raw Artifact import behind its sole entry module", async () => {
    const rawArtifactImports: string[] = [];
    for (const file of await allTypeScriptSourceFiles(sourceRoot)) {
      const source = await readFile(file, "utf8");
      if (
        /from\s+["'][^"']*artifacts[\\/]poparooz-board-104[\\/]1\.0\.0[\\/]board-profile\.json["']/.test(
          source,
        )
      ) {
        rawArtifactImports.push(file);
      }
    }
    expect(rawArtifactImports).toEqual([approvedEntry]);
  });
});

async function allTypeScriptSourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await allTypeScriptSourceFiles(child)));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      files.push(child);
    }
  }
  return files.sort();
}

async function productionSourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await productionSourceFiles(child)));
    } else if (
      entry.isFile() &&
      /\.tsx?$/.test(entry.name) &&
      !/\.(?:test|fixture)\.tsx?$/.test(entry.name)
    ) {
      files.push(child);
    }
  }
  return files.sort();
}

async function collectDependencyGraph(entry: string): Promise<{
  readonly files: readonly string[];
  readonly externalSpecifiers: readonly string[];
}> {
  const files = new Set<string>();
  const externalSpecifiers = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || files.has(file)) continue;
    files.add(file);
    if (file.endsWith(".json")) continue;
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      if (!specifier.startsWith(".")) {
        externalSpecifiers.add(specifier);
        continue;
      }
      pending.push(await resolveImport(file, specifier));
    }
  }
  return {
    files: [...files].sort(),
    externalSpecifiers: [...externalSpecifiers].sort(),
  };
}

async function resolveImport(importer: string, specifier: string) {
  const unresolved = path.resolve(path.dirname(importer), specifier);
  for (const candidate of [
    unresolved,
    `${unresolved}.ts`,
    `${unresolved}.json`,
  ]) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // Continue through the finite browser module suffix list.
    }
  }
  throw new Error(`Unable to resolve BoardProfile module: ${specifier}`);
}
