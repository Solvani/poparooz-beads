// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const bootstrapRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(bootstrapRoot, "../..");
const bootstrapEntry = path.join(
  bootstrapRoot,
  "application-runtime-bootstrap.ts",
);
const approvedBoardArtifact = path.join(
  sourceRoot,
  "runtime",
  "board-profile",
  "artifacts",
  "poparooz-board-104",
  "1.0.0",
  "board-profile.json",
);
const approvedColorSetArtifact = path.join(
  sourceRoot,
  "runtime",
  "color-set",
  "artifacts",
  "poparooz-fixed-color-sets",
  "1.0.0",
  "color-set-profiles.json",
);

describe("Application Runtime Bootstrap boundary", () => {
  it("has the approved browser-only production generation graph without legacy or governance input", async () => {
    const graph = await collectRuntimeDependencyGraph(bootstrapEntry);
    expect(graph.externalSpecifiers).toEqual(["zod"]);
    expect(graph.files).toContain(approvedBoardArtifact);
    expect(graph.files).toContain(approvedColorSetArtifact);
    expect(graph.files).toEqual(
      expect.arrayContaining([
        path.join(sourceRoot, "features", "generator", "generation-service.ts"),
        path.join(
          sourceRoot,
          "domain",
          "color",
          "generation-color-matching.ts",
        ),
        path.join(
          sourceRoot,
          "lib",
          "quantization-worker",
          "quantization-worker.client.ts",
        ),
        path.join(
          sourceRoot,
          "lib",
          "quantization-worker",
          "quantization-worker.factory.ts",
        ),
      ]),
    );
    expect(
      graph.files.some((file) =>
        file.endsWith(path.join("domain", "color", "color-matching.ts")),
      ),
    ).toBe(false);
    expect(
      graph.files.some((file) => file.includes(path.join("domain", "palette"))),
    ).toBe(false);
    expect(
      graph.files.filter((file) => file.endsWith("color-set-profiles.json")),
    ).toEqual([approvedColorSetArtifact]);
    expect(
      graph.files.filter((file) => file.endsWith("board-profile.json")),
    ).toEqual([approvedBoardArtifact]);
    for (const file of graph.files) {
      expect(file.startsWith(sourceRoot)).toBe(true);
      expect(file).not.toMatch(
        /fixture|benchmark|data-source|docs?[\\/]|evidence|scripts[\\/]palette|runtime-lock|runtime-policy|manifest|derivation-audit|validation-report|substitute|catalog|shopify|inventory|candidate/i,
      );
    }
  });

  it("contains no network, persistence, legacy matcher, fixture, or fallback calls", async () => {
    const graph = await collectRuntimeDependencyGraph(bootstrapEntry);
    for (const file of graph.files.filter((candidate) =>
      candidate.endsWith(".ts"),
    )) {
      const source = await readFile(file, "utf8");
      expect(source, file).not.toMatch(
        /node:|fetch\(|XMLHttpRequest|localStorage|indexedDB|document\.cookie|matchNearestPaletteColor|TEST_PALETTE_DEFINITION|palette\.fixture|board-profile\.fixture|BENCHMARK_BOARD_PROFILE|main-thread fallback|fixture fallback/i,
      );
      if (!file.endsWith("quantization-worker.factory.ts")) {
        expect(source, file).not.toMatch(/new Worker\s*\(/);
      }
    }
  });

  it("uses the testable startup sequencer from the real production entry", async () => {
    const mainSource = await readFile(
      path.join(sourceRoot, "main.tsx"),
      "utf8",
    );
    expect(mainSource).toContain("startApplication({");
    expect(mainSource).toContain(
      "bootstrap: bootstrapApprovedApplicationRuntime",
    );
    expect(mainSource).toContain(
      "<App generationRuntime={generationRuntime} />",
    );
    expect(mainSource.indexOf("startApplication({")).toBeLessThan(
      mainSource.indexOf("createRoot(rootElement).render("),
    );
  });
});

async function collectRuntimeDependencyGraph(entry: string): Promise<{
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
    for (const match of source.matchAll(
      /import\s+(?!type\b)[\s\S]*?from\s+["']([^"']+)["']/g,
    )) {
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
      // Continue through the finite local module suffix list.
    }
  }
  throw new Error(`Unable to resolve local startup module: ${specifier}`);
}
