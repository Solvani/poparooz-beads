import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { build, loadConfigFromFile, type Plugin } from "vite";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

describe("formal Palette Node-only production boundary", () => {
  it("keeps ExcelJS and formal compiler modules out of the production module graph", async () => {
    const outputDirectory = await mkdtemp(
      path.join(os.tmpdir(), "poparooz-bundle-boundary-"),
    );
    const moduleIds = new Set<string>();
    const configPath = path.join(repositoryRoot, "vite.config.ts");
    const loadedConfig = await loadConfigFromFile(
      { command: "build", mode: "production" },
      configPath,
      repositoryRoot,
    );
    if (loadedConfig === null) {
      throw new Error("The repository Vite production config was not loaded.");
    }
    expect(normalize(loadedConfig.path)).toBe(normalize(configPath));
    const captureModuleGraph: Plugin = {
      name: "capture-formal-palette-boundary",
      moduleParsed(moduleInfo) {
        moduleIds.add(normalize(moduleInfo.id));
      },
    };

    try {
      await build({
        configFile: configPath,
        mode: "production",
        root: repositoryRoot,
        plugins: [captureModuleGraph],
        build: {
          outDir: outputDirectory,
          emptyOutDir: true,
        },
      });
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }

    const forbidden = [...moduleIds].filter(isForbiddenProductionModule);
    expect(
      forbidden,
      `Forbidden production module IDs:\n${forbidden.join("\n")}`,
    ).toEqual([]);
  }, 30_000);

  it("keeps src imports free of ExcelJS and formal Palette tooling", async () => {
    const sourceFiles = await collectSourceFiles(
      path.join(repositoryRoot, "src"),
    );
    const forbiddenImports: string[] = [];
    const importPatterns = [
      /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
      /import\(\s*["']([^"']+)["']\s*\)/g,
    ];

    for (const filePath of sourceFiles) {
      const source = await readFile(filePath, "utf8");
      for (const importPattern of importPatterns) {
        for (const match of source.matchAll(importPattern)) {
          const specifier = match[1] ?? "";
          if (
            specifier === "exceljs" ||
            specifier.includes("scripts/palette/formal") ||
            specifier.includes("formal-palette-xlsx-compiler")
          ) {
            forbiddenImports.push(
              `${normalize(path.relative(repositoryRoot, filePath))}: ${specifier}`,
            );
          }
        }
      }
    }

    expect(
      forbiddenImports,
      `Forbidden src imports:\n${forbiddenImports.join("\n")}`,
    ).toEqual([]);
  });
});

function isForbiddenProductionModule(moduleId: string): boolean {
  return (
    moduleId.includes("/node_modules/exceljs/") ||
    moduleId.includes("/scripts/palette/formal/") ||
    moduleId.includes("formal-palette-xlsx-compiler")
  );
}

async function collectSourceFiles(directoryPath: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directoryPath, { withFileTypes: true })) {
    const child = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(child)));
    if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) files.push(child);
  }
  return files;
}

function normalize(value: string): string {
  return value.replaceAll("\\", "/");
}
