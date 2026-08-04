import { describe, expect, it, vi } from "vitest";

import approvedRuntimePalette from "./artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json";
import { createApprovedRuntimePaletteProvider } from "./approved-runtime-palette";
import { RuntimePaletteBrowserError } from "./runtime-palette.errors";
import { createRuntimePaletteProvider } from "./runtime-palette.provider";
import { parseRuntimePaletteArtifact } from "./runtime-palette.schema";
import type { RuntimePaletteProvider } from "./runtime-palette.types";

interface MutableColor extends Record<string, unknown> {
  rgb: Record<string, unknown>;
  lab: Record<string, unknown>;
}

interface MutableArtifact extends Record<string, unknown> {
  colors: MutableColor[];
}

describe("Browser Runtime Palette Schema and Provider", () => {
  it("creates the approved 221 / 221 / 221 Provider in business order", () => {
    const provider = createApprovedRuntimePaletteProvider();
    const snapshot = provider.getSnapshot();

    expect(snapshot).toMatchObject({
      schemaVersion: "1.0.0",
      artifactVersion: "1.0.0",
      paletteId: "poparooz-standard",
      paletteVersion: "1.0.0",
      referenceSystem: "POPAROOZ",
      recordCount: 221,
      activeCount: 221,
      autoMatchEligibleCount: 221,
    });
    expect(snapshot.colors).toHaveLength(221);
    for (const index of [0, 110, 220]) {
      expect(snapshot.colors[index]).toEqual(
        approvedRuntimePalette.colors[index],
      );
    }
    expect(snapshot.colors.map((color) => color.code)).toEqual(
      approvedRuntimePalette.colors.map((color) => color.code),
    );
    const middle = snapshot.colors[110]!;
    expect(provider.getColorByCode(middle.code)).toBe(middle);
    expect(provider.getActiveColors()).toHaveLength(221);
    expect(provider.getAutoMatchEligibleColors()).toHaveLength(221);
  });

  it.each([
    "schemaVersion",
    "artifactVersion",
    "paletteId",
    "paletteVersion",
    "referenceSystem",
    "recordCount",
    "activeCount",
    "autoMatchEligibleCount",
    "colors",
  ])("rejects a missing top-level field: %s", (field) => {
    const artifact = mutableArtifact();
    delete artifact[field];
    expectBrowserFailure(artifact);
  });

  it("rejects an unknown top-level field", () => {
    const artifact = mutableArtifact();
    artifact.unknown = true;
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_SCHEMA_INVALID");
  });

  it.each([
    ["schemaVersion", "2.0.0"],
    ["artifactVersion", "2.0.0"],
    ["paletteId", "other"],
    ["paletteVersion", "2.0.0"],
    ["referenceSystem", "OTHER"],
  ])("rejects an incorrect identity field: %s", (field, value) => {
    const artifact = mutableArtifact();
    artifact[field] = value;
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_IDENTITY_MISMATCH");
  });

  it.each([
    ["recordCount", 220],
    ["activeCount", 220],
    ["autoMatchEligibleCount", 220],
  ])("rejects an incorrect approved count: %s", (field, value) => {
    const artifact = mutableArtifact();
    artifact[field] = value;
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_COUNT_MISMATCH");
  });

  it("rejects a non-array colors field", () => {
    const artifact = mutableArtifact();
    artifact.colors = "not an array" as unknown as MutableColor[];
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_COUNT_MISMATCH");
  });

  it.each([
    "code",
    "hex",
    "rgb",
    "lab",
    "sortOrder",
    "active",
    "autoMatchEligible",
  ])("rejects a missing color field: %s", (field) => {
    const artifact = mutableArtifact();
    delete artifact.colors[0]![field];
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_COLOR_INVALID");
  });

  it("rejects an unknown color field", () => {
    const artifact = mutableArtifact();
    artifact.colors[0]!.unknown = true;
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_COLOR_INVALID");
  });

  it.each([
    ["empty code", (color: MutableColor) => (color.code = "")],
    ["code with spaces", (color: MutableColor) => (color.code = " A1")],
    ["lowercase code", (color: MutableColor) => (color.code = "a1")],
    ["invalid HEX", (color: MutableColor) => (color.hex = "#ffffff")],
    ["fractional RGB", (color: MutableColor) => (color.rgb.r = 1.5)],
    ["low RGB", (color: MutableColor) => (color.rgb.g = -1)],
    ["high RGB", (color: MutableColor) => (color.rgb.b = 256)],
    ["NaN Lab", (color: MutableColor) => (color.lab.a = Number.NaN)],
    ["infinite Lab", (color: MutableColor) => (color.lab.b = Infinity)],
    ["out-of-range Lab L", (color: MutableColor) => (color.lab.l = 101)],
    ["fractional sortOrder", (color: MutableColor) => (color.sortOrder = 0.5)],
    ["non-boolean active", (color: MutableColor) => (color.active = "true")],
    [
      "non-boolean eligibility",
      (color: MutableColor) => (color.autoMatchEligible = 1),
    ],
  ])("rejects an invalid color: %s", (_label, mutate) => {
    const artifact = mutableArtifact();
    mutate(artifact.colors[0]!);
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_COLOR_INVALID");
  });

  it("rejects duplicate codes", () => {
    const artifact = mutableArtifact();
    artifact.colors[1]!.code = artifact.colors[0]!.code;
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_DUPLICATE_CODE");
  });

  it.each([
    ["duplicate", 0],
    ["gap", 2],
    ["outside 0..220", 221],
  ])("rejects %s sortOrder", (_label, value) => {
    const artifact = mutableArtifact();
    artifact.colors[1]!.sortOrder = value;
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_SORT_ORDER_INVALID");
  });

  it("rejects one fewer or one extra color", () => {
    const fewer = mutableArtifact();
    fewer.colors.pop();
    expectBrowserFailure(fewer, "RUNTIME_PALETTE_COUNT_MISMATCH");

    const extra = mutableArtifact();
    extra.colors.push(structuredClone(extra.colors[0]!));
    expectBrowserFailure(extra, "RUNTIME_PALETTE_COUNT_MISMATCH");
  });

  it("rejects actual active and eligible count mismatches", () => {
    const inactive = mutableArtifact();
    inactive.colors[0]!.active = false;
    inactive.colors[0]!.autoMatchEligible = false;
    expectBrowserFailure(inactive, "RUNTIME_PALETTE_COUNT_MISMATCH");

    const ineligible = mutableArtifact();
    ineligible.colors[0]!.autoMatchEligible = false;
    expectBrowserFailure(ineligible, "RUNTIME_PALETTE_COUNT_MISMATCH");
  });

  it("rejects eligible=true with active=false", () => {
    const artifact = mutableArtifact();
    artifact.colors[0]!.active = false;
    expectBrowserFailure(artifact, "RUNTIME_PALETTE_POLICY_INVALID");
  });

  it("deep-copies and deeply freezes the Snapshot and all query results", () => {
    const input = mutableArtifact();
    const originalCode = input.colors[0]!.code;
    const originalRed = input.colors[0]!.rgb.r;
    const provider = createRuntimePaletteProvider(input);
    const snapshot = provider.getSnapshot();

    input.colors[0]!.code = "A999";
    input.colors[0]!.rgb.r = 0;
    input.colors[0]!.lab.l = 0;
    input.colors.pop();

    expect(snapshot.colors).toHaveLength(221);
    expect(snapshot.colors[0]!.code).toBe(originalCode);
    expect(snapshot.colors[0]!.rgb.r).toBe(originalRed);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.colors)).toBe(true);
    expect(Object.isFrozen(snapshot.colors[0])).toBe(true);
    expect(Object.isFrozen(snapshot.colors[0]!.rgb)).toBe(true);
    expect(Object.isFrozen(snapshot.colors[0]!.lab)).toBe(true);
    expect(Object.isFrozen(provider.getActiveColors())).toBe(true);
    expect(Object.isFrozen(provider.getAutoMatchEligibleColors())).toBe(true);

    expect(Reflect.set(snapshot, "recordCount", 0)).toBe(false);
    expect(Reflect.set(snapshot.colors, "0", undefined)).toBe(false);
    expect(Reflect.set(snapshot.colors[0]!, "code", "A999")).toBe(false);
    expect(Reflect.set(snapshot.colors[0]!.rgb, "r", 0)).toBe(false);
    expect(Reflect.set(snapshot.colors[0]!.lab, "l", 0)).toBe(false);

    const queried = provider.getColorByCode(String(originalCode));
    expect(queried).toBe(snapshot.colors[0]);
    expect(Reflect.set(queried!, "hex", "#000000")).toBe(false);
    expect(provider.getColorByCode(String(originalCode))!.hex).toBe(
      approvedRuntimePalette.colors[0]!.hex,
    );
    expect(Object.keys(provider).sort()).toEqual([
      "getActiveColors",
      "getAutoMatchEligibleColors",
      "getColorByCode",
      "getSnapshot",
    ]);
  });

  it("performs exact code lookup without trim, case conversion, or aliases", () => {
    const provider = createApprovedRuntimePaletteProvider();
    const code = provider.getSnapshot().colors[0]!.code;
    expect(provider.getColorByCode(code)?.code).toBe(code);
    expect(provider.getColorByCode(code.toLowerCase())).toBeUndefined();
    expect(provider.getColorByCode(` ${code}`)).toBeUndefined();
    expect(provider.getColorByCode(`${code} `)).toBeUndefined();
  });

  it("fails closed with a safe stable error and no warning-only fallback", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const artifact = mutableArtifact();
    artifact.colors[0]!.hex = "invalid";
    let provider: RuntimePaletteProvider | undefined;
    let error: unknown;
    try {
      provider = createRuntimePaletteProvider(artifact);
    } catch (caught) {
      error = caught;
    }
    expect(provider).toBeUndefined();
    expect(error).toBeInstanceOf(RuntimePaletteBrowserError);
    expect(error).toMatchObject({ code: "RUNTIME_PALETTE_COLOR_INVALID" });
    expect(String(error)).not.toMatch(
      /[A-Za-z]:[\\/]|sha-?256|zod|runtime-palette\.lock|scripts\/palette/i,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

function mutableArtifact(): MutableArtifact {
  return structuredClone(approvedRuntimePalette) as unknown as MutableArtifact;
}

function expectBrowserFailure(
  input: unknown,
  code?: RuntimePaletteBrowserError["code"],
): void {
  let error: unknown;
  try {
    parseRuntimePaletteArtifact(input);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(RuntimePaletteBrowserError);
  if (code !== undefined) expect(error).toMatchObject({ code });
}
