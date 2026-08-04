import { describe, expect, it } from "vitest";

import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import type { RuntimePaletteSnapshot } from "../palette/runtime-palette.types";
import {
  GenerationPaletteAdapterError,
  type GenerationPaletteAdapterErrorCode,
} from "./generation-palette.errors";
import { adaptRuntimePaletteToGeneration } from "./runtime-to-generation-palette.adapter";

interface MutableRuntimeColor extends Record<string, unknown> {
  code: unknown;
  hex: unknown;
  rgb: Record<"r" | "g" | "b", unknown>;
  lab: Record<"l" | "a" | "b", unknown>;
  sortOrder: unknown;
  active: unknown;
  autoMatchEligible: unknown;
}

interface MutableRuntimeSnapshot extends Record<string, unknown> {
  schemaVersion: unknown;
  artifactVersion: unknown;
  paletteId: unknown;
  paletteVersion: unknown;
  referenceSystem: unknown;
  recordCount: unknown;
  activeCount: unknown;
  autoMatchEligibleCount: unknown;
  colors: MutableRuntimeColor[];
}

const FORBIDDEN_COLOR_FIELDS = [
  "isSellable",
  "referenceCode",
  "supplier",
  "finish",
  "finishType",
  "isSpecialFinish",
  "productHandle",
  "variantId",
  "inventory",
  "packSize",
  "provenance",
  "substitutes",
] as const;

describe("Runtime-to-Generation Palette Adapter", () => {
  it("maps the approved 221 / 221 / 221 Snapshot without changing values or order", () => {
    const runtime = approvedSnapshot();
    const generation = adaptRuntimePaletteToGeneration(runtime);

    expect(generation.identity).toEqual({
      schemaVersion: runtime.schemaVersion,
      artifactVersion: runtime.artifactVersion,
      paletteId: runtime.paletteId,
      paletteVersion: runtime.paletteVersion,
    });
    expect(generation).toMatchObject({
      recordCount: 221,
      activeCount: 221,
      autoMatchEligibleCount: 221,
    });
    expect(generation.colors).toHaveLength(221);
    expect(generation.colors.map((color) => color.code)).toEqual(
      runtime.colors.map((color) => color.code),
    );

    for (const index of [0, 110, 220]) {
      const source = runtime.colors[index]!;
      expect(generation.colors[index]).toEqual({
        code: source.code,
        hex: source.hex,
        rgb: [source.rgb.r, source.rgb.g, source.rgb.b],
        lab: [source.lab.l, source.lab.a, source.lab.b],
        sortOrder: source.sortOrder,
        active: source.active,
        autoMatchEligible: source.autoMatchEligible,
      });
    }
  });

  it("is deterministic and publishes only the frozen generation allowlist", () => {
    const first = adaptRuntimePaletteToGeneration(approvedSnapshot());
    const second = adaptRuntimePaletteToGeneration(approvedSnapshot());

    expect(second).toEqual(first);
    expect(Object.keys(first).sort()).toEqual([
      "activeCount",
      "autoMatchEligibleCount",
      "colors",
      "identity",
      "recordCount",
    ]);
    expect(Object.keys(first.identity).sort()).toEqual([
      "artifactVersion",
      "paletteId",
      "paletteVersion",
      "schemaVersion",
    ]);
    for (const color of first.colors) {
      expect(Object.keys(color).sort()).toEqual([
        "active",
        "autoMatchEligible",
        "code",
        "hex",
        "lab",
        "rgb",
        "sortOrder",
      ]);
      for (const field of FORBIDDEN_COLOR_FIELDS) {
        expect(color).not.toHaveProperty(field);
      }
    }
    expect(JSON.stringify(first)).not.toMatch(
      /MARD|isSellable|referenceCode|finishType|packSize|variantId|inventory|provenance|substitutes/,
    );
  });

  it("defensively copies and deeply freezes all published data", () => {
    const input = mutableApprovedSnapshot();
    const generation = adaptRuntimePaletteToGeneration(
      asRuntimeSnapshot(input),
    );
    const firstColor = generation.colors[0]!;
    const inputFirstColor = input.colors[0]!;
    const original = structuredClone(firstColor);

    expect(Object.isFrozen(generation)).toBe(true);
    expect(Object.isFrozen(generation.identity)).toBe(true);
    expect(Object.isFrozen(generation.colors)).toBe(true);
    expect(Object.isFrozen(firstColor)).toBe(true);
    expect(Object.isFrozen(firstColor.rgb)).toBe(true);
    expect(Object.isFrozen(firstColor.lab)).toBe(true);
    expect(firstColor).not.toBe(inputFirstColor);
    expect(firstColor.rgb).not.toBe(inputFirstColor.rgb);
    expect(firstColor.lab).not.toBe(inputFirstColor.lab);

    inputFirstColor.code = "A999";
    inputFirstColor.rgb.r = 0;
    inputFirstColor.lab.l = 0;
    input.colors.pop();

    expect(firstColor).toEqual(original);
    expect(generation.colors).toHaveLength(221);
    expect(Reflect.set(generation, "recordCount", 0)).toBe(false);
    expect(Reflect.set(generation.identity, "paletteId", "other")).toBe(false);
    expect(Reflect.set(generation.colors, "0", undefined)).toBe(false);
    expect(Reflect.set(firstColor, "code", "A999")).toBe(false);
    expect(Reflect.set(firstColor.rgb, "0", 0)).toBe(false);
    expect(Reflect.set(firstColor.lab, "0", 0)).toBe(false);
    expect(firstColor).toEqual(original);
  });

  it.each([
    [
      "schema identity",
      "GENERATION_PALETTE_IDENTITY_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.schemaVersion = "2.0.0";
      },
    ],
    [
      "artifact identity",
      "GENERATION_PALETTE_IDENTITY_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.artifactVersion = "2.0.0";
      },
    ],
    [
      "Palette identity",
      "GENERATION_PALETTE_IDENTITY_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.paletteId = "other";
      },
    ],
    [
      "Palette version",
      "GENERATION_PALETTE_IDENTITY_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.paletteVersion = "2.0.0";
      },
    ],
    [
      "reference system",
      "GENERATION_PALETTE_IDENTITY_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.referenceSystem = "OTHER";
      },
    ],
    [
      "record count",
      "GENERATION_PALETTE_COUNT_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.recordCount = 220;
      },
    ],
    [
      "active count",
      "GENERATION_PALETTE_COUNT_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.activeCount = 220;
      },
    ],
    [
      "eligible count",
      "GENERATION_PALETTE_COUNT_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.autoMatchEligibleCount = 220;
      },
    ],
    [
      "actual colors array length",
      "GENERATION_PALETTE_COUNT_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors.pop();
      },
    ],
    [
      "duplicate code",
      "GENERATION_PALETTE_DUPLICATE_CODE",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[1]!.code = snapshot.colors[0]!.code;
      },
    ],
    [
      "duplicate sortOrder",
      "GENERATION_PALETTE_SORT_ORDER_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[1]!.sortOrder = 0;
      },
    ],
    [
      "negative sortOrder",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.sortOrder = -1;
      },
    ],
    [
      "fractional sortOrder",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.sortOrder = 0.5;
      },
    ],
    [
      "reordered records",
      "GENERATION_PALETTE_SORT_ORDER_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        [snapshot.colors[0], snapshot.colors[1]] = [
          snapshot.colors[1]!,
          snapshot.colors[0]!,
        ];
      },
    ],
    [
      "missing field",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        delete snapshot.colors[0]!.hex;
      },
    ],
    [
      "invalid HEX",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.hex = "#ffffff";
      },
    ],
    [
      "out-of-range RGB",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.rgb.r = 256;
      },
    ],
    [
      "fractional RGB",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.rgb.g = 1.5;
      },
    ],
    [
      "non-finite RGB",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.rgb.b = Number.POSITIVE_INFINITY;
      },
    ],
    [
      "non-finite Lab",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.lab.a = Number.NaN;
      },
    ],
    [
      "finite out-of-range Lab L",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.lab.l = 101;
      },
    ],
    [
      "actual flag counts",
      "GENERATION_PALETTE_COUNT_MISMATCH",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.active = false;
        snapshot.colors[0]!.autoMatchEligible = false;
      },
    ],
    [
      "enrichment field",
      "GENERATION_PALETTE_COLOR_INVALID",
      (snapshot: MutableRuntimeSnapshot) => {
        snapshot.colors[0]!.isSellable = true;
      },
    ],
  ] as const)("rejects invalid %s", (_label, code, mutate) => {
    const snapshot = mutableApprovedSnapshot();
    mutate(snapshot);
    expectAdapterFailure(asRuntimeSnapshot(snapshot), code);
  });

  it("projects structurally valid values supplied by the owning Provider", () => {
    const changedValue = mutableApprovedSnapshot();
    changedValue.colors[0]!.hex = "#000000";
    const generation = adaptRuntimePaletteToGeneration(
      asRuntimeSnapshot(changedValue),
    );

    expect(generation.colors[0]!.hex).toBe("#000000");
  });

  it("uses stable safe Adapter errors without internal or customer data", () => {
    const snapshot = mutableApprovedSnapshot();
    snapshot.colors[0]!.lab.b = Number.POSITIVE_INFINITY;

    let error: unknown;
    try {
      adaptRuntimePaletteToGeneration(asRuntimeSnapshot(snapshot));
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(GenerationPaletteAdapterError);
    expect(String(error)).not.toMatch(
      /[A-Za-z]:[\\/]|runtime-palette\.lock|xlsx|provenance|MARD|substitute|pixel|zod|\{.*\}/i,
    );
  });
});

function approvedSnapshot(): RuntimePaletteSnapshot {
  return createApprovedRuntimePaletteProvider().getSnapshot();
}

function mutableApprovedSnapshot(): MutableRuntimeSnapshot {
  return structuredClone(
    approvedSnapshot(),
  ) as unknown as MutableRuntimeSnapshot;
}

function asRuntimeSnapshot(
  snapshot: MutableRuntimeSnapshot,
): RuntimePaletteSnapshot {
  return snapshot as unknown as RuntimePaletteSnapshot;
}

function expectAdapterFailure(
  input: RuntimePaletteSnapshot,
  code: GenerationPaletteAdapterErrorCode,
): void {
  let error: unknown;
  try {
    adaptRuntimePaletteToGeneration(input);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(GenerationPaletteAdapterError);
  expect(error).toMatchObject({ code });
}
