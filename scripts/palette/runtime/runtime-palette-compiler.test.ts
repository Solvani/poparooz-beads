import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { compileFormalPaletteColors } from "../formal/formal-palette-color-compiler.ts";
import { validateNormalizedFormalPalette } from "../formal/formal-palette.validation.ts";
import type { NormalizedFormalPalette } from "../formal/formal-palette.types.ts";
import {
  compileRuntimePalette,
  type RuntimePaletteCompilerInput,
} from "./runtime-palette-compiler.ts";
import { RuntimePaletteCompilationError } from "./runtime-palette-errors.ts";

const repositoryRoot = process.cwd();
const formalDirectory = path.join(
  repositoryRoot,
  "data-source/palettes/poparooz-standard/1.0.0",
);
const policyPath = path.join(
  repositoryRoot,
  "scripts/palette/runtime/policies/poparooz-standard.formal-1.0.0.runtime-1.0.0.json",
);
const artifactPath = path.join(
  repositoryRoot,
  "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
);

let approvedInput: RuntimePaletteCompilerInput;

beforeAll(async () => {
  const [manifest, normalized, audit, report, policy] = await Promise.all([
    readFile(path.join(formalDirectory, "manifest.json"), "utf8"),
    readFile(path.join(formalDirectory, "normalized-palette.json"), "utf8"),
    readFile(path.join(formalDirectory, "color-derivation-audit.json"), "utf8"),
    readFile(
      path.join(formalDirectory, "palette-validation-report.json"),
      "utf8",
    ),
    readFile(policyPath, "utf8"),
  ]);
  approvedInput = {
    manifest: JSON.parse(manifest),
    normalizedPalette: JSON.parse(normalized),
    derivationAudit: JSON.parse(audit),
    derivationAuditBytes: audit,
    validationReport: JSON.parse(report),
    policy: JSON.parse(policy),
  };
});

describe("deterministic Runtime Palette compiler", () => {
  it("compiles the exact v1 identity, counts, business order, and flags", () => {
    const { artifact } = compileRuntimePalette(approvedInput);
    expect(artifact).toMatchObject({
      schemaVersion: "1.0.0",
      artifactVersion: "1.0.0",
      paletteId: "poparooz-standard",
      paletteVersion: "1.0.0",
      referenceSystem: "POPAROOZ",
      recordCount: 221,
      activeCount: 221,
      autoMatchEligibleCount: 221,
    });
    expect(artifact.colors).toHaveLength(221);
    expect(artifact.colors.map(({ sortOrder }) => sortOrder)).toEqual(
      Array.from({ length: 221 }, (_, index) => index),
    );
    expect(new Set(artifact.colors.map(({ code }) => code)).size).toBe(221);
    expect(artifact.colors.every(({ active }) => active)).toBe(true);
    expect(
      artifact.colors.every(({ autoMatchEligible }) => autoMatchEligible),
    ).toBe(true);
  });

  it("uses only the recursive Runtime Artifact whitelist", () => {
    const { artifact } = compileRuntimePalette(approvedInput);
    expect(Object.keys(artifact)).toEqual([
      "schemaVersion",
      "artifactVersion",
      "paletteId",
      "paletteVersion",
      "referenceSystem",
      "recordCount",
      "activeCount",
      "autoMatchEligibleCount",
      "colors",
    ]);
    for (const color of artifact.colors) {
      expect(Object.keys(color)).toEqual([
        "code",
        "hex",
        "rgb",
        "lab",
        "sortOrder",
        "active",
        "autoMatchEligible",
      ]);
      expect(Object.keys(color.rgb)).toEqual(["r", "g", "b"]);
      expect(Object.keys(color.lab)).toEqual(["l", "a", "b"]);
    }
  });

  it("derives first, middle, and last RGB/Lab through the frozen compiler", () => {
    const normalized = parseApprovedNormalized(approvedInput.normalizedPalette);
    const expected = compileFormalPaletteColors(normalized);
    const actual = compileRuntimePalette(approvedInput).artifact.colors;
    for (const index of [0, 110, 220]) {
      const expectedColor = required(expected, index);
      expect(required(actual, index)).toMatchObject({
        code: expectedColor.code,
        hex: expectedColor.hex,
        rgb: {
          r: expectedColor.rgb[0],
          g: expectedColor.rgb[1],
          b: expectedColor.rgb[2],
        },
        lab: {
          l: expectedColor.lab[0],
          a: expectedColor.lab[1],
          b: expectedColor.lab[2],
        },
      });
    }
  });

  it("emits byte-identical output and SHA-256 on repeated compilation", () => {
    const first = compileRuntimePalette(approvedInput);
    const second = compileRuntimePalette(cloneInput());
    expect(second.bytes).toBe(first.bytes);
    expect(second.sha256).toBe(first.sha256);
    expect(first.bytes).not.toContain("\r");
    expect(first.bytes.endsWith("\n")).toBe(true);
    expect(first.bytes.endsWith("\n\n")).toBe(false);
    expect(first.sha256).toBe(
      createHash("sha256").update(first.bytes, "utf8").digest("hex"),
    );
  });

  it("matches the committed generated Artifact bytes", async () => {
    expect(await readFile(artifactPath, "utf8")).toBe(
      compileRuntimePalette(approvedInput).bytes,
    );
  });

  it.each([
    [
      "unapproved manifest",
      (input: MutableInput) => set(input.manifest, "status", "draft"),
      "FORMAL_MANIFEST_INVALID",
    ],
    [
      "unknown manifest field",
      (input: MutableInput) => set(input.manifest, "extra", true),
      "FORMAL_MANIFEST_INVALID",
    ],
    [
      "unknown normalized field",
      (input: MutableInput) => set(firstColor(input), "extra", true),
      "FORMAL_PALETTE_INVALID",
    ],
    [
      "duplicate code",
      (input: MutableInput) =>
        set(secondColor(input), "code", firstColor(input).code),
      "FORMAL_PALETTE_INVALID",
    ],
    [
      "duplicate HEX",
      (input: MutableInput) =>
        set(secondColor(input), "hex", firstColor(input).hex),
      "FORMAL_PALETTE_INVALID",
    ],
    [
      "invalid HEX",
      (input: MutableInput) => set(firstColor(input), "hex", "#xyzxyz"),
      "FORMAL_PALETTE_INVALID",
    ],
    [
      "record-count mismatch",
      (input: MutableInput) =>
        set(input.normalizedPalette.manifest, "recordCount", 220),
      "FORMAL_PALETTE_INVALID",
    ],
    [
      "failed report",
      (input: MutableInput) => set(input.validationReport, "result", "failed"),
      "FORMAL_VALIDATION_REPORT_INVALID",
    ],
    [
      "policy identity mismatch",
      (input: MutableInput) => set(input.policy, "paletteVersion", "2.0.0"),
      "RUNTIME_POLICY_INVALID",
    ],
    [
      "policy false default",
      (input: MutableInput) => set(input.policy.defaults, "active", false),
      "RUNTIME_POLICY_INVALID",
    ],
    [
      "policy override",
      (input: MutableInput) =>
        set(input.policy, "overrides", [{ code: "A1", active: false }]),
      "RUNTIME_POLICY_INVALID",
    ],
  ])("fails closed for %s", (_label, mutate, code) => {
    const input = cloneInput();
    mutate(input);
    expectCompilationError(input, code);
  });

  it.each([
    [
      "missing record",
      (records: Record<string, unknown>[]) => records.pop(),
      "DERIVATION_AUDIT_INVALID",
    ],
    [
      "extra record",
      (records: Record<string, unknown>[]) =>
        records.push(structuredClone(required(records, 0))),
      "DERIVATION_AUDIT_INVALID",
    ],
    [
      "duplicate record",
      (records: Record<string, unknown>[]) => {
        records[1] = structuredClone(required(records, 0));
      },
      "DERIVATION_MISMATCH",
    ],
    [
      "RGB mismatch",
      (records: Record<string, unknown>[]) => {
        (required(records, 0).rgb8 as Record<string, unknown>).r = 0;
      },
      "DERIVATION_MISMATCH",
    ],
    [
      "Lab mismatch",
      (records: Record<string, unknown>[]) => {
        (required(records, 0).lab as Record<string, unknown>).l = 0;
      },
      "DERIVATION_MISMATCH",
    ],
  ])("rejects derivation audit %s", (_label, mutate, code) => {
    const input = cloneInput();
    const records = input.derivationAudit.records as Record<string, unknown>[];
    mutate(records);
    input.derivationAuditBytes = `${JSON.stringify(input.derivationAudit, null, 2)}\n`;
    expectCompilationError(input, code);
  });
});

type MutableInput = {
  manifest: Record<string, unknown>;
  normalizedPalette: {
    manifest: Record<string, unknown>;
    colors: Record<string, unknown>[];
  };
  derivationAudit: Record<string, unknown>;
  derivationAuditBytes: string;
  validationReport: Record<string, unknown>;
  policy: { defaults: Record<string, unknown> } & Record<string, unknown>;
};

function cloneInput(): MutableInput {
  return structuredClone(approvedInput) as MutableInput;
}

function firstColor(input: MutableInput): Record<string, unknown> {
  return required(input.normalizedPalette.colors, 0);
}

function secondColor(input: MutableInput): Record<string, unknown> {
  return required(input.normalizedPalette.colors, 1);
}

function set(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  target[key] = value;
}

function expectCompilationError(input: MutableInput, code: string): void {
  try {
    compileRuntimePalette(input);
    throw new Error("Expected Runtime Palette compilation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(RuntimePaletteCompilationError);
    expect((error as RuntimePaletteCompilationError).code).toBe(code);
  }
}

function parseApprovedNormalized(input: unknown): NormalizedFormalPalette {
  const result = validateNormalizedFormalPalette(input);
  if (!result.success)
    throw new Error("Approved normalized fixture is invalid.");
  return result.data;
}

function required<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Missing fixture value ${index}.`);
  return value;
}
