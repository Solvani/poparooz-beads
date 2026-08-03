import { createHash } from "node:crypto";

import { hashCanonicalFormalPaletteRecords } from "../formal/formal-palette-canonical.ts";
import { compileFormalPaletteColors } from "../formal/formal-palette-color-compiler.ts";
import {
  createFormalColorDerivationAudit,
  FORMAL_COLOR_DERIVATION_ALGORITHM,
  FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION,
  hashFormalColorDerivationAuditBytes,
  serializeFormalColorDerivationAudit,
  type FormalColorDerivationAudit,
} from "../formal/formal-palette-derivation-audit.ts";
import { FormalPaletteManifestSchema } from "../formal/formal-palette.schema.ts";
import { validateNormalizedFormalPalette } from "../formal/formal-palette.validation.ts";
import { RuntimePaletteCompilationError } from "./runtime-palette-errors.ts";
import {
  RuntimePaletteArtifactSchema,
  RuntimePalettePolicySchema,
  type RuntimePaletteArtifact,
} from "./runtime-palette.schema.ts";

const sha256SchemaPattern = /^[0-9a-f]{64}$/;

export interface RuntimePaletteCompilerInput {
  readonly manifest: unknown;
  readonly normalizedPalette: unknown;
  readonly derivationAudit: unknown;
  readonly derivationAuditBytes: string;
  readonly validationReport: unknown;
  readonly policy: unknown;
}

export interface RuntimePaletteCompilation {
  readonly artifact: RuntimePaletteArtifact;
  readonly bytes: string;
  readonly sha256: string;
}

export function compileRuntimePalette(
  input: RuntimePaletteCompilerInput,
): RuntimePaletteCompilation {
  const manifestResult = FormalPaletteManifestSchema.safeParse(input.manifest);
  if (!manifestResult.success || !isApprovedManifest(manifestResult.data)) {
    throw new RuntimePaletteCompilationError(
      "FORMAL_MANIFEST_INVALID",
      "The Formal Palette Manifest is not the approved v1 identity.",
    );
  }

  const normalizedResult = validateNormalizedFormalPalette(
    input.normalizedPalette,
  );
  if (!normalizedResult.success) {
    throw new RuntimePaletteCompilationError(
      "FORMAL_PALETTE_INVALID",
      "The normalized Formal Palette failed strict validation.",
      { cause: normalizedResult.issues },
    );
  }
  const normalized = normalizedResult.data;
  if (
    !sameJson(manifestResult.data, normalized.manifest) ||
    !isApprovedManifest(normalized.manifest)
  ) {
    throw new RuntimePaletteCompilationError(
      "FORMAL_MANIFEST_INVALID",
      "The standalone and normalized Formal Palette manifests do not match.",
    );
  }
  if (
    hashCanonicalFormalPaletteRecords(normalized.colors) !==
    manifestResult.data.canonicalRecordsSha256
  ) {
    throw new RuntimePaletteCompilationError(
      "FORMAL_PALETTE_INVALID",
      "The normalized Formal Palette canonical hash does not match the Manifest.",
    );
  }

  const report = parseValidationReport(input.validationReport);
  if (
    report.result !== "passed" ||
    report.recordCount !== 221 ||
    report.issues.length !== 0 ||
    report.paletteId !== manifestResult.data.paletteId ||
    report.paletteVersion !== manifestResult.data.paletteVersion ||
    report.sourceFileSha256 !== manifestResult.data.sourceFileSha256 ||
    report.canonicalRecordsSha256 !==
      manifestResult.data.canonicalRecordsSha256 ||
    report.derivationAlgorithm !== FORMAL_COLOR_DERIVATION_ALGORITHM ||
    report.derivationDecimalPrecision !==
      FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION
  ) {
    throw new RuntimePaletteCompilationError(
      "FORMAL_VALIDATION_REPORT_INVALID",
      "The Formal Palette validation report is not an approved passing report.",
    );
  }

  const policyResult = RuntimePalettePolicySchema.safeParse(input.policy);
  if (!policyResult.success) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_POLICY_INVALID",
      "The Runtime Palette policy failed strict validation.",
    );
  }

  const compiledColors = compileFormalPaletteColors(normalized);
  const expectedAudit = createFormalColorDerivationAudit(
    normalized,
    compiledColors,
  );
  const actualAudit = parseDerivationAudit(input.derivationAudit);
  const actualAuditHash = hashFormalColorDerivationAuditBytes(
    input.derivationAuditBytes,
  );
  if (
    report.derivationAuditSha256 !== actualAuditHash ||
    serializeFormalColorDerivationAudit(actualAudit) !==
      input.derivationAuditBytes ||
    !sameJson(actualAudit, expectedAudit)
  ) {
    throw new RuntimePaletteCompilationError(
      "DERIVATION_MISMATCH",
      "The Formal color derivation audit does not match deterministic derivation.",
    );
  }

  const candidate = {
    schemaVersion: "1.0.0",
    artifactVersion: policyResult.data.artifactVersion,
    paletteId: manifestResult.data.paletteId,
    paletteVersion: manifestResult.data.paletteVersion,
    referenceSystem: manifestResult.data.referenceSystem,
    recordCount: 221,
    activeCount: 221,
    autoMatchEligibleCount: 221,
    colors: compiledColors.map((color) => ({
      code: color.code,
      hex: color.hex,
      rgb: { r: color.rgb[0], g: color.rgb[1], b: color.rgb[2] },
      lab: { l: color.lab[0], a: color.lab[1], b: color.lab[2] },
      sortOrder: color.sortOrder,
      active: policyResult.data.defaults.active,
      autoMatchEligible: policyResult.data.defaults.autoMatchEligible,
    })),
  };
  const artifactResult = RuntimePaletteArtifactSchema.safeParse(candidate);
  if (!artifactResult.success) {
    throw new RuntimePaletteCompilationError(
      "RUNTIME_ARTIFACT_INVALID",
      "The compiled Runtime Palette failed its strict Artifact contract.",
      { cause: artifactResult.error },
    );
  }
  const bytes = `${JSON.stringify(artifactResult.data, null, 2)}\n`;
  return {
    artifact: artifactResult.data,
    bytes,
    sha256: createHash("sha256").update(bytes, "utf8").digest("hex"),
  };
}

function isApprovedManifest(manifest: {
  readonly [key: string]: unknown;
}): boolean {
  return (
    manifest.schemaVersion === "1.0.0" &&
    manifest.paletteId === "poparooz-standard" &&
    manifest.paletteVersion === "1.0.0" &&
    manifest.referenceSystem === "POPAROOZ" &&
    manifest.recordCount === 221 &&
    manifest.status === "approved"
  );
}

function parseValidationReport(input: unknown): ValidationReport {
  if (!isRecord(input)) failReport();
  const expectedKeys = [
    "schemaVersion",
    "paletteId",
    "paletteVersion",
    "sourceFileSha256",
    "canonicalRecordsSha256",
    "recordCount",
    "seriesCounts",
    "duplicateCodeCount",
    "duplicateHexCount",
    "missingHexCount",
    "invalidHexCount",
    "invalidCodeCount",
    "nonContiguousSeriesCount",
    "derivationFailureCount",
    "derivationAuditRecordCount",
    "derivationAuditSha256",
    "derivationAlgorithm",
    "derivationDecimalPrecision",
    "result",
    "issues",
  ];
  if (!hasExactKeys(input, expectedKeys)) failReport();
  if (
    input.schemaVersion !== "1.0.0" ||
    typeof input.paletteId !== "string" ||
    typeof input.paletteVersion !== "string" ||
    typeof input.sourceFileSha256 !== "string" ||
    !sha256SchemaPattern.test(input.sourceFileSha256) ||
    typeof input.canonicalRecordsSha256 !== "string" ||
    !sha256SchemaPattern.test(input.canonicalRecordsSha256) ||
    typeof input.derivationAuditSha256 !== "string" ||
    !sha256SchemaPattern.test(input.derivationAuditSha256) ||
    typeof input.recordCount !== "number" ||
    input.derivationAlgorithm !== FORMAL_COLOR_DERIVATION_ALGORITHM ||
    input.derivationDecimalPrecision !== 12 ||
    !Array.isArray(input.issues) ||
    input.result !== "passed"
  ) {
    failReport();
  }
  const zeroFields = expectedKeys.filter(
    (key) =>
      key.endsWith("Count") &&
      key !== "recordCount" &&
      key !== "derivationAuditRecordCount",
  );
  if (zeroFields.some((key) => input[key] !== 0)) failReport();
  if (input.derivationAuditRecordCount !== 221) failReport();
  if (
    !isRecord(input.seriesCounts) ||
    !sameJson(input.seriesCounts, {
      A: 26,
      B: 32,
      C: 29,
      D: 26,
      E: 24,
      F: 25,
      G: 21,
      H: 23,
      M: 15,
    })
  ) {
    failReport();
  }
  return input as unknown as ValidationReport;
}

function parseDerivationAudit(input: unknown): FormalColorDerivationAudit {
  if (!isRecord(input)) failAudit();
  if (
    !hasExactKeys(input, [
      "schemaVersion",
      "paletteId",
      "paletteVersion",
      "algorithm",
      "decimalPrecision",
      "recordCount",
      "records",
    ]) ||
    input.schemaVersion !== "1.0.0" ||
    input.paletteId !== "poparooz-standard" ||
    input.paletteVersion !== "1.0.0" ||
    input.algorithm !== FORMAL_COLOR_DERIVATION_ALGORITHM ||
    input.decimalPrecision !== 12 ||
    input.recordCount !== 221 ||
    !Array.isArray(input.records) ||
    input.records.length !== 221
  ) {
    failAudit();
  }
  for (const record of input.records) {
    if (
      !isRecord(record) ||
      !hasExactKeys(record, [
        "code",
        "hex",
        "canonicalSourceIndex",
        "sortOrder",
        "rgb8",
        "lab",
      ]) ||
      typeof record.code !== "string" ||
      typeof record.hex !== "string" ||
      !Number.isInteger(record.canonicalSourceIndex) ||
      !Number.isInteger(record.sortOrder) ||
      !isNumericTriple(record.rgb8, true) ||
      !isNumericTriple(record.lab, false)
    ) {
      failAudit();
    }
  }
  return input as unknown as FormalColorDerivationAudit;
}

function isNumericTriple(value: unknown, integer: boolean): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(
      value,
      ["r", "g", "b"].every((key) => key in value)
        ? ["r", "g", "b"]
        : ["l", "a", "b"],
    ) &&
    Object.values(value).every(
      (entry) =>
        typeof entry === "number" &&
        Number.isFinite(entry) &&
        (!integer || Number.isInteger(entry)),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function failReport(): never {
  throw new RuntimePaletteCompilationError(
    "FORMAL_VALIDATION_REPORT_INVALID",
    "The Formal Palette validation report failed strict validation.",
  );
}

function failAudit(): never {
  throw new RuntimePaletteCompilationError(
    "DERIVATION_AUDIT_INVALID",
    "The Formal color derivation audit failed strict validation.",
  );
}

interface ValidationReport extends Record<string, unknown> {
  readonly paletteId: string;
  readonly paletteVersion: string;
  readonly sourceFileSha256: string;
  readonly canonicalRecordsSha256: string;
  readonly recordCount: number;
  readonly derivationAuditSha256: string;
  readonly derivationAlgorithm: string;
  readonly derivationDecimalPrecision: number;
  readonly result: string;
  readonly issues: readonly unknown[];
}
