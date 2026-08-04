import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const runtimeScripts = path.join(repositoryRoot, "scripts/palette/runtime");
const sourceRoot = path.join(repositoryRoot, "src");

describe("Runtime Palette dependency boundaries", () => {
  it("keeps compiler production modules free of workbook, substitute, and ExcelJS dependencies", async () => {
    const files = (await collectFiles(runtimeScripts)).filter(
      (file) =>
        !file.endsWith(".test.ts") &&
        !file.endsWith("runtime-palette.json") &&
        !file.endsWith("runtime-palette-production-bundle-boundary.ts"),
    );
    for (const file of files) {
      const source = await readFile(file, "utf8");
      expect(source, file).not.toMatch(/exceljs/i);
      expect(source, file).not.toMatch(/\.xlsx|Poparooz色卡/i);
      expect(source, file).not.toMatch(
        /normalized-substitutes|canonical-substitute|substitute-validation-report|formal-palette-substitutes/i,
      );
    }
  });

  it("keeps the Lock generator dependency graph free of ExcelJS, XLSX, and Substitute modules", async () => {
    const graph = await collectDependencyGraph(
      path.join(runtimeScripts, "generate-runtime-palette-lock.ts"),
    );
    expect(graph.externalSpecifiers).not.toContain("exceljs");
    for (const file of graph.files) {
      expect(file).not.toMatch(
        /formal-palette-(xlsx-compiler|substitutes)|normalized-substitutes|canonical-substitute/i,
      );
    }
  });

  it("keeps the Production Gate dependency graph Node-only and free of workbook tooling", async () => {
    const graph = await collectDependencyGraph(
      path.join(runtimeScripts, "verify-runtime-palette-production-gate.ts"),
    );
    expect(graph.externalSpecifiers).not.toContain("exceljs");
    for (const file of graph.files) {
      expect(file).not.toMatch(/formal-palette-(xlsx-compiler|substitutes)/i);
    }
  });

  it("keeps src modules from importing Node compiler or policy modules", async () => {
    const files = (await collectFiles(sourceRoot)).filter((file) =>
      /\.(ts|tsx|js|jsx)$/.test(file),
    );
    for (const file of files) {
      const source = await readFile(file, "utf8");
      expect(source, file).not.toMatch(/scripts\/palette\/runtime/i);
      expect(source, file).not.toMatch(/runtime\/policies/i);
      expect(source, file).not.toMatch(/data-source\/runtime-locks/i);
      expect(source, file).not.toMatch(/generate-runtime-palette-lock/i);
    }
  });

  it("keeps the Artifact free of forbidden provenance and catalog fields", async () => {
    const artifact = await readFile(
      path.join(
        sourceRoot,
        "runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
      ),
      "utf8",
    );
    for (const forbidden of [
      "displayName",
      "canonicalSourceIndex",
      "sourceLocation",
      "isSellable",
      "isSpecialFinish",
      "packSize",
      "inventory",
      "substitutes",
      "MARD",
      "sourceFileSha256",
      "generatedAt",
    ]) {
      expect(artifact).not.toContain(forbidden);
    }
  });

  it("preserves all four frozen Formal package hash boundaries", async () => {
    const formalRoot = path.join(
      repositoryRoot,
      "data-source/palettes/poparooz-standard/1.0.0",
    );
    const approved = [
      [
        "source/Poparooz色卡.xlsx",
        "5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e",
      ],
      [
        "canonical-palette-records.txt",
        "1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4",
      ],
      [
        "color-derivation-audit.json",
        "f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020",
      ],
      [
        "canonical-substitute-records.txt",
        "5582d15099ed4e623b0af325e884f6567cc405cecb72af2efdf587ceed5693a7",
      ],
    ] as const;
    for (const [relativePath, expected] of approved) {
      const bytes = await readFile(path.join(formalRoot, relativePath));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected);
    }
  });

  it("keeps the Node-only Lock outside src and out of browser imports", async () => {
    const lockPath = path.join(
      repositoryRoot,
      "data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.lock.json",
    );
    expect(lockPath.startsWith(sourceRoot)).toBe(false);
    expect(await readFile(lockPath, "utf8")).toContain(
      '"lockVersion": "1.0.0"',
    );
  });
});

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function collectDependencyGraph(entry: string): Promise<{
  files: string[];
  externalSpecifiers: string[];
}> {
  const files = new Set<string>();
  const externalSpecifiers = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || files.has(file)) continue;
    files.add(file);
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      if (!specifier.startsWith(".")) {
        externalSpecifiers.add(specifier);
        continue;
      }
      const resolved = path.resolve(path.dirname(file), specifier);
      pending.push(
        /\.(?:ts|tsx|js|mjs|cjs)$/.test(resolved) ? resolved : `${resolved}.ts`,
      );
    }
  }
  return {
    files: [...files].sort(),
    externalSpecifiers: [...externalSpecifiers].sort(),
  };
}
