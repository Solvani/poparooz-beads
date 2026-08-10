// @vitest-environment node

import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { build, type Plugin } from "vite";
import { describe, expect, it } from "vitest";

import approvedRuntimePalette from "../../../src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json";
import approvedColorSets from "../../../src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json";
import { verifyColorSetProductionBundleBoundary } from "../color-set/color-set-production-bundle-boundary.ts";
import {
  APPROVED_BOARD_PROFILE_ARTIFACT_MODULE,
  APPROVED_RUNTIME_ARTIFACT_MODULE,
  POPAROOZ_COLOR_CODE_GRAMMAR_MODULE,
  type EmittedProductionFile,
  RuntimePaletteBundleBoundaryError,
  verifyRuntimePaletteArtifactBoundary,
  verifyRuntimePaletteProductionBundleBoundary,
} from "./runtime-palette-production-bundle-boundary.ts";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const configPath = path.join(repositoryRoot, "vite.config.ts");
const approvedArtifactPath = path.join(
  repositoryRoot,
  ...APPROVED_RUNTIME_ARTIFACT_MODULE.slice(1).split("/"),
);

describe("Runtime Palette production bundle boundary", () => {
  it("passes the real production module graph and emitted bundle", async () => {
    const inspection = await withTemporaryProductionBuild(
      async ({ moduleIds, emittedFiles }) => {
        const runtimeArtifact = JSON.parse(
          await readFile(approvedArtifactPath, "utf8"),
        ) as unknown;
        const runtimeBoundary = verifyRuntimePaletteProductionBundleBoundary({
          moduleIds,
          emittedFiles,
          runtimeArtifact,
        });
        return {
          ...runtimeBoundary,
          colorSetBoundary: verifyColorSetProductionBundleBoundary({
            moduleIds,
            emittedFiles,
            artifact: approvedColorSets,
          }),
        };
      },
    );

    expect(inspection).toMatchObject({
      requiredModuleCount: 14,
      generatedPaletteDataModules: [normalize(approvedArtifactPath)],
      boardProfileDataModules: [
        expect.stringContaining(APPROVED_BOARD_PROFILE_ARTIFACT_MODULE),
      ],
      recordCount: 221,
      activeCount: 221,
      autoMatchEligibleCount: 221,
      verified: true,
    });
    expect(inspection.emittedFileCount).toBeGreaterThan(0);
    expect(inspection.colorSetBoundary).toMatchObject({
      requiredModuleCount: 6,
      groupCount: 9,
      profileCounts: [24, 48, 72, 120, 168, 221],
      verified: true,
    });
  }, 30_000);

  it.each([
    [
      "Runtime Lock",
      "D:/repo/data-source/runtime-locks/palette/runtime-palette.lock.json",
    ],
    [
      "Runtime Policy",
      "D:/repo/scripts/palette/runtime/policies/runtime-palette-policy.json",
    ],
    ["Formal Manifest", "D:/repo/data-source/palettes/formal/manifest.json"],
    ["ExcelJS", "D:/repo/node_modules/exceljs/lib/exceljs.nodejs.js"],
    ["Node built-in", "node:fs"],
    [
      "Substitute",
      "D:/repo/data-source/palettes/formal/normalized-substitutes.json",
    ],
    ["MARD fixture", "D:/repo/src/domain/palette/mard-palette.fixture.ts"],
    [
      "candidate BoardProfile",
      "D:/repo/src/runtime/board-profile/candidate/profile.ts",
    ],
    [
      "78 x 78 BoardProfile",
      "D:/repo/src/runtime/board-profile/candidate-78/profile.ts",
    ],
    [
      "52 x 52 BoardProfile",
      "D:/repo/src/runtime/board-profile/candidate-52/profile.ts",
    ],
    [
      "BoardProfile fixture",
      "D:/repo/src/domain/board/board-profile.fixture.ts",
    ],
    ["benchmark fixture", "D:/repo/scripts/benchmarks/benchmark-fixtures.ts"],
    [
      "Legacy BoardProfile module",
      "D:/repo/src/domain/board/board-profile.schema.ts",
    ],
    [
      "BoardProfile evidence",
      "D:/repo/evidence/board-profile-measurements.json",
    ],
    ["BoardProfile documentation", "D:/repo/docs/board-profile.md"],
    [
      "BoardProfile compiler",
      "D:/repo/scripts/board-profile/board-profile-compiler.ts",
    ],
    [
      "BoardProfile manifest",
      "D:/repo/src/runtime/board-profile/board-manifest.json",
    ],
    [
      "BoardProfile lock",
      "D:/repo/src/runtime/board-profile/board-profile.lock.json",
    ],
    [
      "BoardProfile hash pipeline",
      "D:/repo/scripts/board-profile/publish-board-hash.ts",
    ],
  ])("rejects a browser import of %s", (_label, forbiddenModule) => {
    expectBoundaryFailure(
      () =>
        verifyRuntimePaletteProductionBundleBoundary(
          validInspection({
            moduleIds: [...requiredModuleIds(), forbiddenModule],
          }),
        ),
      "RUNTIME_BUNDLE_FORBIDDEN_MODULE",
    );
  });

  it("rejects a missing approved BoardProfile Artifact", () => {
    expectBoundaryFailure(
      () =>
        verifyRuntimePaletteProductionBundleBoundary(
          validInspection({
            moduleIds: requiredModuleIds().filter(
              (moduleId) => moduleId !== APPROVED_BOARD_PROFILE_ARTIFACT_MODULE,
            ),
          }),
        ),
      "RUNTIME_BUNDLE_REQUIRED_MODULE_MISSING",
    );
  });

  it.each([
    [
      "a second BoardProfile JSON",
      "/src/runtime/board-profile/artifacts/poparooz-board-104/1.0.1/board-profile.json",
    ],
    [
      "an unknown BoardProfile Artifact",
      "/src/runtime/board-profile/artifacts/unknown/1.0.0/board-profile.json",
    ],
  ])("rejects %s", (_label, extraArtifact) => {
    expectBoundaryFailure(
      () =>
        verifyRuntimePaletteProductionBundleBoundary(
          validInspection({
            moduleIds: [...requiredModuleIds(), extraArtifact],
          }),
        ),
      "RUNTIME_BUNDLE_BOARD_PROFILE_DATA_INVALID",
    );
  });

  it("rejects a second generated Palette data module", () => {
    expectBoundaryFailure(
      () =>
        verifyRuntimePaletteProductionBundleBoundary(
          validInspection({
            moduleIds: [
              ...requiredModuleIds(),
              "/src/runtime/palette/artifacts/copy/runtime-palette.json",
            ],
          }),
        ),
      "RUNTIME_BUNDLE_GENERATED_DATA_INVALID",
    );
  });

  it.each([
    "sourceLocation",
    "runtimeLockSha256",
    "codeA",
    "codeB",
    "applicationPolicy",
    "MARD",
    "data-source/runtime-locks",
  ])("rejects forbidden emitted content: %s", (forbidden) => {
    const content = [
      "sourceLocation",
      "runtimeLockSha256",
      "codeA",
      "codeB",
      "applicationPolicy",
    ].includes(forbidden)
      ? `{${forbidden}:\"A1\"}`
      : forbidden;
    expectBoundaryFailure(
      () =>
        verifyRuntimePaletteProductionBundleBoundary(
          validInspection({
            emittedFiles: [{ relativePath: "assets/app.js", content }],
          }),
        ),
      "RUNTIME_BUNDLE_EMITTED_CONTENT_FORBIDDEN",
    );
  });

  it.each([
    "assets/source.xlsx",
    "assets/runtime-palette.lock.json",
    "assets/formal-manifest.json",
    "assets/normalized-palette.json",
    "assets/normalized-substitutes.json",
    "assets/runtime-palette-policy.json",
  ])("rejects an extra generated-data output: %s", (relativePath) => {
    expectBoundaryFailure(
      () =>
        verifyRuntimePaletteProductionBundleBoundary(
          validInspection({ emittedFiles: [{ relativePath, content: "{}" }] }),
        ),
      "RUNTIME_BUNDLE_EMITTED_FILE_FORBIDDEN",
    );
  });

  it.each([
    [
      "unknown top-level",
      (artifact: MutableArtifact) => (artifact.extra = true),
    ],
    [
      "provenance",
      (artifact: MutableArtifact) =>
        (artifact.colors[0]!.sourceLocation = "Sheet1!A1"),
    ],
    [
      "sellability",
      (artifact: MutableArtifact) => (artifact.colors[0]!.isSellable = true),
    ],
    [
      "nested provenance",
      (artifact: MutableArtifact) =>
        (artifact.colors[0]!.rgb.sourceSha256 = "not allowed"),
    ],
  ])("rejects an Artifact %s field", async (_label, mutate) => {
    const artifact = await readApprovedArtifact();
    mutate(artifact);
    expectBoundaryFailure(
      () => verifyRuntimePaletteArtifactBoundary(artifact),
      "RUNTIME_BUNDLE_ARTIFACT_INVALID",
    );
  });

  it("removes the temporary output after a successful inspection", async () => {
    let temporaryOutput = "";
    await withTemporaryProductionBuild(async ({ outputDirectory }) => {
      temporaryOutput = outputDirectory;
      expect(await exists(outputDirectory)).toBe(true);
    });
    expect(await exists(temporaryOutput)).toBe(false);
  }, 30_000);

  it("removes the temporary output after a boundary failure", async () => {
    let temporaryOutput = "";
    await expect(
      withTemporaryProductionBuild(async ({ outputDirectory }) => {
        temporaryOutput = outputDirectory;
        verifyRuntimePaletteProductionBundleBoundary(
          validInspection({
            moduleIds: [
              ...requiredModuleIds(),
              "D:/repo/node_modules/exceljs/index.js",
            ],
          }),
        );
      }),
    ).rejects.toMatchObject({
      code: "RUNTIME_BUNDLE_FORBIDDEN_MODULE",
    });
    expect(await exists(temporaryOutput)).toBe(false);
  }, 30_000);
});

interface ProductionBuildInspection {
  readonly outputDirectory: string;
  readonly moduleIds: readonly string[];
  readonly emittedFiles: readonly EmittedProductionFile[];
}

async function withTemporaryProductionBuild<T>(
  inspect: (inspection: ProductionBuildInspection) => Promise<T> | T,
): Promise<T> {
  const outputDirectory = await mkdtemp(
    path.join(os.tmpdir(), "poparooz-runtime-bundle-boundary-"),
  );
  const moduleIds = new Set<string>();
  const captureModuleGraph: Plugin = {
    name: "capture-runtime-palette-production-boundary",
    moduleParsed(moduleInfo) {
      moduleIds.add(normalize(moduleInfo.id));
    },
  };

  try {
    await build({
      configFile: configPath,
      mode: "production",
      root: repositoryRoot,
      logLevel: "silent",
      plugins: [captureModuleGraph],
      build: {
        outDir: outputDirectory,
        emptyOutDir: true,
        manifest: true,
      },
    });
    return await inspect({
      outputDirectory,
      moduleIds: [...moduleIds].sort(),
      emittedFiles: await collectEmittedFiles(outputDirectory),
    });
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}

async function collectEmittedFiles(
  directory: string,
  root = directory,
): Promise<EmittedProductionFile[]> {
  const files: EmittedProductionFile[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectEmittedFiles(child, root)));
    } else if (entry.isFile()) {
      files.push({
        relativePath: normalize(path.relative(root, child)),
        content: await readFile(child, "utf8"),
      });
    }
  }
  return files.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

function validInspection(
  overrides: Partial<{
    moduleIds: readonly string[];
    emittedFiles: readonly EmittedProductionFile[];
    runtimeArtifact: unknown;
  }> = {},
) {
  return {
    moduleIds: overrides.moduleIds ?? requiredModuleIds(),
    emittedFiles:
      overrides.emittedFiles ??
      ([{ relativePath: "assets/app.js", content: "approved" }] as const),
    runtimeArtifact: overrides.runtimeArtifact ?? approvedArtifactFixture(),
  };
}

function requiredModuleIds(): string[] {
  return [
    "/src/main.tsx",
    POPAROOZ_COLOR_CODE_GRAMMAR_MODULE,
    "/src/runtime/bootstrap/application-runtime-bootstrap.ts",
    "/src/runtime/bootstrap/application-startup.ts",
    "/src/runtime/palette/approved-runtime-palette.ts",
    "/src/runtime/palette/runtime-palette.provider.ts",
    "/src/runtime/palette/runtime-palette.schema.ts",
    APPROVED_RUNTIME_ARTIFACT_MODULE,
    "/src/runtime/board-profile/approved-board-profile.ts",
    "/src/runtime/board-profile/board-profile.provider.ts",
    "/src/runtime/board-profile/board-profile.schema.ts",
    APPROVED_BOARD_PROFILE_ARTIFACT_MODULE,
    "/src/runtime/generation-board-profile/board-profile-to-generation.adapter.ts",
    "/src/runtime/generation-board-profile/generation-board-profile.schema.ts",
  ];
}

function approvedArtifactFixture(): unknown {
  return structuredClone(approvedRuntimePalette);
}

interface MutableColor extends Record<string, unknown> {
  rgb: Record<string, unknown>;
  lab: Record<string, unknown>;
}

interface MutableArtifact extends Record<string, unknown> {
  colors: MutableColor[];
}

async function readApprovedArtifact(): Promise<MutableArtifact> {
  return JSON.parse(
    await readFile(approvedArtifactPath, "utf8"),
  ) as MutableArtifact;
}

function expectBoundaryFailure(
  invoke: () => unknown,
  code: RuntimePaletteBundleBoundaryError["code"],
): void {
  let failure: unknown;
  try {
    invoke();
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(RuntimePaletteBundleBoundaryError);
  expect(failure).toMatchObject({ code });
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalize(value: string): string {
  return value.replaceAll("\\", "/");
}
