// @vitest-environment node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const paletteRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(paletteRoot, "../../..");
const approvedEntry = path.join(paletteRoot, "approved-runtime-palette.ts");
const sharedColorCodeGrammar = path.join(
  repositoryRoot,
  "src/domain/color/poparooz-color-code.ts",
);
const approvedArtifact = path.join(
  paletteRoot,
  "artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
);

describe("Browser Runtime Palette dependency boundary", () => {
  it("has one browser-safe module graph and one generated JSON input", async () => {
    const graph = await collectDependencyGraph(approvedEntry);
    expect(graph.externalSpecifiers).toEqual(["zod"]);
    expect(graph.files).toContain(approvedArtifact);
    expect(graph.files.filter((file) => file.endsWith(".json"))).toEqual([
      approvedArtifact,
    ]);
    expect(
      graph.files.filter((file) =>
        file.includes(`${path.sep}domain${path.sep}color${path.sep}`),
      ),
    ).toEqual([sharedColorCodeGrammar]);
    for (const file of graph.files) {
      expect(
        file.startsWith(paletteRoot) || file === sharedColorCodeGrammar,
      ).toBe(true);
      expect(file).not.toMatch(
        /data-source|scripts[\\/]palette|runtime-lock|runtime-policy|manifest|derivation-audit|validation-report|substitute|fixture|domain[\\/]palette/i,
      );
    }
  });

  it("keeps production modules free of Node, network, storage, Worker, and legacy imports", async () => {
    const graph = await collectDependencyGraph(approvedEntry);
    for (const file of graph.files.filter((candidate) =>
      candidate.endsWith(".ts"),
    )) {
      const source = await readFile(file, "utf8");
      expect(source, file).not.toMatch(
        /node:|fetch\(|XMLHttpRequest|localStorage|indexedDB|document\.cookie|new Worker|PaletteDefinition|GenerationRuntime|createGenerationService|assemblePattern/i,
      );
    }
  });

  it("preserves the approved Artifact and Lock byte fingerprints", async () => {
    const lockPath = path.join(
      repositoryRoot,
      "data-source",
      `runtime-${"locks"}`,
      "poparooz-standard",
      "formal-1.0.0",
      "runtime-1.0.0",
      "runtime-palette.lock.json",
    );
    expect(await sha256(approvedArtifact)).toBe(
      "86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70",
    );
    expect(await sha256(lockPath)).toBe(
      "36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648",
    );
  });
});

async function sha256(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
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
    `${unresolved}.tsx`,
    `${unresolved}.json`,
  ]) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // Continue through the finite list of supported local module suffixes.
    }
  }
  throw new Error(
    `Unable to resolve local Browser Palette module: ${specifier}`,
  );
}
