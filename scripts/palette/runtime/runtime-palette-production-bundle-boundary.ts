import { builtinModules } from "node:module";

import { RuntimePaletteArtifactSchema } from "./runtime-palette.schema.ts";

export const APPROVED_RUNTIME_ARTIFACT_MODULE =
  "/src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json";

const requiredProductionModules = [
  "/src/main.tsx",
  "/src/runtime/bootstrap/application-runtime-bootstrap.ts",
  "/src/runtime/bootstrap/application-startup.ts",
  "/src/runtime/palette/approved-runtime-palette.ts",
  "/src/runtime/palette/runtime-palette.provider.ts",
  "/src/runtime/palette/runtime-palette.schema.ts",
  APPROVED_RUNTIME_ARTIFACT_MODULE,
] as const;

const topLevelArtifactFields = [
  "schemaVersion",
  "artifactVersion",
  "paletteId",
  "paletteVersion",
  "referenceSystem",
  "recordCount",
  "activeCount",
  "autoMatchEligibleCount",
  "colors",
] as const;
const colorArtifactFields = [
  "code",
  "hex",
  "rgb",
  "lab",
  "sortOrder",
  "active",
  "autoMatchEligible",
] as const;
const rgbArtifactFields = ["r", "g", "b"] as const;
const labArtifactFields = ["l", "a", "b"] as const;

const forbiddenGeneratedFilePatterns = [
  /\.xlsx$/i,
  /\.xls$/i,
  /\.lock\.json$/i,
  /(?:^|\/)normalized-palette\.json$/i,
  /(?:^|\/)formal-manifest\.json$/i,
  /(?:^|\/)canonical-palette-records\.txt$/i,
  /(?:^|\/)color-derivation-audit\.json$/i,
  /(?:^|\/)palette-validation-report\.json$/i,
  /(?:^|\/)normalized-substitutes\.json$/i,
  /(?:^|\/)canonical-substitute-records\.txt$/i,
  /(?:^|\/)substitute-validation-report\.json$/i,
  /(?:^|\/)runtime-palette-policy(?:\.[^/]*)?\.json$/i,
  /(?:^|\/)(?:staging|tmp|temp|backup|bak|old)(?:\/|\.|$)/i,
] as const;

const forbiddenEmittedContent = [
  ...[
    "sourceLocation",
    "canonicalSourceIndex",
    "digitalColorStatus",
    "physicalColorStatus",
    "sourceSha256",
    "paletteCanonicalSha256",
    "derivationAuditSha256",
    "runtimeLockSha256",
    "runtimeArtifactSha256",
    "codeA",
    "codeB",
    "applicationPolicy",
    "isSellable",
    "isSpecialFinish",
    "packSize",
    "generatedAt",
    "generatedBy",
  ].map((field) => ({
    label: field,
    pattern: new RegExp(
      `(?:["']${field}["']|\\.${field}\\b|(?:^|[,{])\\s*${field}\\s*:)`,
      "m",
    ),
  })),
  { label: "Shopify", pattern: /Shopify/i },
  { label: "MARD", pattern: /MARD/ },
  { label: "supplier", pattern: /supplier/i },
  { label: "formal source workbook", pattern: /Poparooz色卡\.xlsx/i },
  { label: "data-source/palettes", pattern: /data-source[\\/]palettes/i },
  {
    label: "data-source/runtime-locks",
    pattern: /data-source[\\/]runtime-locks/i,
  },
  { label: "scripts/palette", pattern: /scripts[\\/]palette/i },
] as const;

const nodeBuiltins = new Set(
  builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]),
);

export type RuntimePaletteBundleBoundaryErrorCode =
  | "RUNTIME_BUNDLE_REQUIRED_MODULE_MISSING"
  | "RUNTIME_BUNDLE_FORBIDDEN_MODULE"
  | "RUNTIME_BUNDLE_GENERATED_DATA_INVALID"
  | "RUNTIME_BUNDLE_EMITTED_FILE_FORBIDDEN"
  | "RUNTIME_BUNDLE_EMITTED_CONTENT_FORBIDDEN"
  | "RUNTIME_BUNDLE_ARTIFACT_INVALID";

export class RuntimePaletteBundleBoundaryError extends Error {
  constructor(
    readonly code: RuntimePaletteBundleBoundaryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RuntimePaletteBundleBoundaryError";
  }
}

export interface EmittedProductionFile {
  readonly relativePath: string;
  readonly content: string;
}

export interface RuntimePaletteProductionBundleInspection {
  readonly moduleIds: readonly string[];
  readonly emittedFiles: readonly EmittedProductionFile[];
  readonly runtimeArtifact: unknown;
}

export interface RuntimePaletteProductionBundleBoundaryResult {
  readonly requiredModuleCount: number;
  readonly moduleCount: number;
  readonly emittedFileCount: number;
  readonly generatedPaletteDataModules: readonly string[];
  readonly recordCount: 221;
  readonly activeCount: 221;
  readonly autoMatchEligibleCount: 221;
  readonly verified: true;
}

export function verifyRuntimePaletteProductionBundleBoundary(
  inspection: RuntimePaletteProductionBundleInspection,
): RuntimePaletteProductionBundleBoundaryResult {
  const normalizedModuleIds = inspection.moduleIds.map(normalizeModuleId);
  verifyRequiredProductionModules(normalizedModuleIds);
  verifyForbiddenProductionModules(normalizedModuleIds);
  const generatedPaletteDataModules =
    verifyGeneratedPaletteDataModules(normalizedModuleIds);
  const artifact = verifyRuntimePaletteArtifactBoundary(
    inspection.runtimeArtifact,
  );
  verifyEmittedProductionFiles(inspection.emittedFiles);

  return Object.freeze({
    requiredModuleCount: requiredProductionModules.length,
    moduleCount: normalizedModuleIds.length,
    emittedFileCount: inspection.emittedFiles.length,
    generatedPaletteDataModules: Object.freeze(generatedPaletteDataModules),
    recordCount: artifact.recordCount,
    activeCount: artifact.activeCount,
    autoMatchEligibleCount: artifact.autoMatchEligibleCount,
    verified: true,
  });
}

export function verifyRuntimePaletteArtifactBoundary(input: unknown): {
  readonly recordCount: 221;
  readonly activeCount: 221;
  readonly autoMatchEligibleCount: 221;
} {
  const parsed = RuntimePaletteArtifactSchema.safeParse(input);
  if (!parsed.success) {
    fail(
      "RUNTIME_BUNDLE_ARTIFACT_INVALID",
      "The approved Runtime Artifact failed its strict schema and invariant review.",
    );
  }

  if (!isRecord(input)) {
    fail(
      "RUNTIME_BUNDLE_ARTIFACT_INVALID",
      "The approved Runtime Artifact must be an object.",
    );
  }
  assertExactKeys(input, topLevelArtifactFields, "Runtime Artifact");
  parsed.data.colors.forEach((color, index) => {
    assertExactKeys(color, colorArtifactFields, `Runtime color ${index}`);
    assertExactKeys(color.rgb, rgbArtifactFields, `Runtime color ${index} RGB`);
    assertExactKeys(color.lab, labArtifactFields, `Runtime color ${index} Lab`);
  });

  return Object.freeze({
    recordCount: parsed.data.recordCount,
    activeCount: parsed.data.activeCount,
    autoMatchEligibleCount: parsed.data.autoMatchEligibleCount,
  });
}

function verifyRequiredProductionModules(moduleIds: readonly string[]): void {
  for (const requiredModule of requiredProductionModules) {
    if (!moduleIds.some((moduleId) => moduleId.endsWith(requiredModule))) {
      fail(
        "RUNTIME_BUNDLE_REQUIRED_MODULE_MISSING",
        `Required production module was not parsed: ${requiredModule}`,
      );
    }
  }
}

function verifyForbiddenProductionModules(moduleIds: readonly string[]): void {
  for (const moduleId of moduleIds) {
    const forbiddenReason = forbiddenModuleReason(moduleId);
    if (forbiddenReason !== undefined) {
      fail(
        "RUNTIME_BUNDLE_FORBIDDEN_MODULE",
        `Forbidden production module (${forbiddenReason}): ${moduleId}`,
      );
    }
  }
}

function verifyGeneratedPaletteDataModules(
  moduleIds: readonly string[],
): string[] {
  const generatedDataModules = moduleIds.filter(isGeneratedPaletteDataModule);
  if (
    generatedDataModules.length !== 1 ||
    !generatedDataModules[0]?.endsWith(APPROVED_RUNTIME_ARTIFACT_MODULE)
  ) {
    fail(
      "RUNTIME_BUNDLE_GENERATED_DATA_INVALID",
      `Production graph must contain only the approved Runtime Artifact; found: ${generatedDataModules.join(", ") || "none"}`,
    );
  }
  return generatedDataModules;
}

function verifyEmittedProductionFiles(
  emittedFiles: readonly EmittedProductionFile[],
): void {
  for (const emittedFile of emittedFiles) {
    const relativePath = normalizeRelativePath(emittedFile.relativePath);
    const forbiddenFilePattern = forbiddenGeneratedFilePatterns.find(
      (pattern) => pattern.test(relativePath),
    );
    if (forbiddenFilePattern !== undefined) {
      fail(
        "RUNTIME_BUNDLE_EMITTED_FILE_FORBIDDEN",
        `Forbidden emitted file: ${relativePath}`,
      );
    }

    for (const forbidden of forbiddenEmittedContent) {
      if (forbidden.pattern.test(emittedFile.content)) {
        fail(
          "RUNTIME_BUNDLE_EMITTED_CONTENT_FORBIDDEN",
          `Forbidden emitted content (${forbidden.label}) in ${relativePath}.`,
        );
      }
    }
  }
}

function forbiddenModuleReason(moduleId: string): string | undefined {
  const unqualified = moduleId.split("?")[0] ?? moduleId;
  if (unqualified.startsWith("node:") || nodeBuiltins.has(unqualified)) {
    return "Node built-in";
  }
  if (unqualified.includes("/node_modules/exceljs/")) return "ExcelJS";
  if (/\/node_modules\/(?:xlsx|sheetjs|node-xlsx)(?:\/|$)/i.test(unqualified)) {
    return "XLSX parser";
  }
  if (unqualified.includes("/scripts/palette/runtime/")) {
    return "Node-only Runtime tooling";
  }
  if (unqualified.includes("/scripts/palette/formal/")) {
    return "Formal Palette tooling";
  }
  if (unqualified.includes("/data-source/runtime-locks/")) {
    return "Runtime Lock";
  }
  if (unqualified.includes("/data-source/palettes/")) {
    return "Formal Palette package";
  }
  if (
    /(?:runtime-palette\.lock|runtime-palette-policy|\/policies\/|manifest\.json|normalized-palette|canonical-palette|derivation-audit|validation-report|substitute|\.xlsx?$)/i.test(
      unqualified,
    )
  ) {
    return "forbidden generated or governance input";
  }
  if (
    /(?:palette\.fixture|formal-palette-fixture|mard.*fixture|test_palette_definition|palette-csv|csv.*palette)/i.test(
      unqualified,
    )
  ) {
    return "legacy or test Palette input";
  }
  if (/(?:\/catalog\/|shopify|\/inventory\/)/i.test(unqualified)) {
    return "catalog, Shopify, or inventory module";
  }
  return undefined;
}

function isGeneratedPaletteDataModule(moduleId: string): boolean {
  const unqualified = moduleId.split("?")[0] ?? moduleId;
  return (
    /\.(?:json|xlsx?|txt)$/i.test(unqualified) &&
    /(?:palette|runtime-lock|substitute|manifest|audit|validation|policy|data-source)/i.test(
      unqualified,
    )
  );
}

function assertExactKeys(
  input: object,
  allowed: readonly string[],
  location: string,
): void {
  const keys = Object.keys(input);
  if (
    keys.length !== allowed.length ||
    keys.some((key, index) => key !== allowed[index])
  ) {
    fail(
      "RUNTIME_BUNDLE_ARTIFACT_INVALID",
      `${location} fields do not match the frozen ordered whitelist.`,
    );
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function normalizeModuleId(moduleId: string): string {
  return moduleId.replace(/^\0/, "").replaceAll("\\", "/");
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function fail(
  code: RuntimePaletteBundleBoundaryErrorCode,
  message: string,
): never {
  throw new RuntimePaletteBundleBoundaryError(code, message);
}
