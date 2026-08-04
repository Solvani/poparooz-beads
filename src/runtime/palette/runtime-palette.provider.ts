import { RuntimePaletteBrowserError } from "./runtime-palette.errors";
import { parseRuntimePaletteArtifact } from "./runtime-palette.schema";
import type {
  RuntimePaletteArtifact,
  RuntimePaletteColor,
  RuntimePaletteProvider,
  RuntimePaletteSnapshot,
} from "./runtime-palette.types";

export function createRuntimePaletteProvider(
  input: unknown,
): RuntimePaletteProvider {
  try {
    const artifact = parseRuntimePaletteArtifact(input);
    const snapshot = createImmutableSnapshot(artifact);
    const colorsByCode = new Map(
      snapshot.colors.map((color) => [color.code, color] as const),
    );
    const activeColors = Object.freeze(
      snapshot.colors.filter((color) => color.active),
    );
    const eligibleColors = Object.freeze(
      snapshot.colors.filter((color) => color.autoMatchEligible),
    );

    return Object.freeze({
      getSnapshot: () => snapshot,
      getColorByCode: (code: string) => colorsByCode.get(code),
      getActiveColors: () => activeColors,
      getAutoMatchEligibleColors: () => eligibleColors,
    });
  } catch (error) {
    if (error instanceof RuntimePaletteBrowserError) throw error;
    throw new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_PROVIDER_INITIALIZATION_FAILED",
    );
  }
}

function createImmutableSnapshot(
  artifact: RuntimePaletteArtifact,
): RuntimePaletteSnapshot {
  const colors = Object.freeze(artifact.colors.map(copyAndFreezeColor));
  return Object.freeze({
    schemaVersion: artifact.schemaVersion,
    artifactVersion: artifact.artifactVersion,
    paletteId: artifact.paletteId,
    paletteVersion: artifact.paletteVersion,
    referenceSystem: artifact.referenceSystem,
    recordCount: artifact.recordCount,
    activeCount: artifact.activeCount,
    autoMatchEligibleCount: artifact.autoMatchEligibleCount,
    colors,
  });
}

function copyAndFreezeColor(color: RuntimePaletteColor): RuntimePaletteColor {
  return Object.freeze({
    code: color.code,
    hex: color.hex,
    rgb: Object.freeze({
      r: color.rgb.r,
      g: color.rgb.g,
      b: color.rgb.b,
    }),
    lab: Object.freeze({
      l: color.lab.l,
      a: color.lab.a,
      b: color.lab.b,
    }),
    sortOrder: color.sortOrder,
    active: color.active,
    autoMatchEligible: color.autoMatchEligible,
  });
}
