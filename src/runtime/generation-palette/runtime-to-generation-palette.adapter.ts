import { RuntimePaletteBrowserError } from "../palette/runtime-palette.errors";
import { parseRuntimePaletteArtifact } from "../palette/runtime-palette.schema";
import type { RuntimePaletteSnapshot } from "../palette/runtime-palette.types";
import { GenerationPaletteAdapterError } from "./generation-palette.errors";
import { parseGenerationPaletteSnapshot } from "./generation-palette.schema";
import type {
  GenerationPaletteColor,
  GenerationPaletteSnapshot,
} from "./generation-palette.types";

export function adaptRuntimePaletteToGeneration(
  input: RuntimePaletteSnapshot,
): GenerationPaletteSnapshot {
  let runtimeSnapshot: RuntimePaletteSnapshot;
  try {
    runtimeSnapshot = parseRuntimePaletteArtifact(input);
  } catch (error) {
    if (error instanceof RuntimePaletteBrowserError) {
      throw adapterErrorForRuntimeFailure(error);
    }
    throw new GenerationPaletteAdapterError("GENERATION_PALETTE_INPUT_INVALID");
  }

  const candidate = {
    identity: {
      schemaVersion: runtimeSnapshot.schemaVersion,
      artifactVersion: runtimeSnapshot.artifactVersion,
      paletteId: runtimeSnapshot.paletteId,
      paletteVersion: runtimeSnapshot.paletteVersion,
    },
    recordCount: runtimeSnapshot.recordCount,
    activeCount: runtimeSnapshot.activeCount,
    autoMatchEligibleCount: runtimeSnapshot.autoMatchEligibleCount,
    colors: runtimeSnapshot.colors.map((color) => ({
      code: color.code,
      hex: color.hex,
      rgb: [color.rgb.r, color.rgb.g, color.rgb.b],
      lab: [color.lab.l, color.lab.a, color.lab.b],
      sortOrder: color.sortOrder,
      active: color.active,
      autoMatchEligible: color.autoMatchEligible,
    })),
  };

  return createImmutableSnapshot(parseGenerationPaletteSnapshot(candidate));
}

function adapterErrorForRuntimeFailure(
  error: RuntimePaletteBrowserError,
): GenerationPaletteAdapterError {
  switch (error.code) {
    case "RUNTIME_PALETTE_IDENTITY_MISMATCH":
      return new GenerationPaletteAdapterError(
        "GENERATION_PALETTE_IDENTITY_MISMATCH",
      );
    case "RUNTIME_PALETTE_COUNT_MISMATCH":
      return new GenerationPaletteAdapterError(
        "GENERATION_PALETTE_COUNT_MISMATCH",
      );
    case "RUNTIME_PALETTE_DUPLICATE_CODE":
      return new GenerationPaletteAdapterError(
        "GENERATION_PALETTE_DUPLICATE_CODE",
      );
    case "RUNTIME_PALETTE_SORT_ORDER_INVALID":
      return new GenerationPaletteAdapterError(
        "GENERATION_PALETTE_SORT_ORDER_INVALID",
      );
    case "RUNTIME_PALETTE_COLOR_INVALID":
    case "RUNTIME_PALETTE_POLICY_INVALID":
      return new GenerationPaletteAdapterError(
        "GENERATION_PALETTE_COLOR_INVALID",
      );
    default:
      return new GenerationPaletteAdapterError(
        "GENERATION_PALETTE_INPUT_INVALID",
      );
  }
}

function createImmutableSnapshot(
  snapshot: GenerationPaletteSnapshot,
): GenerationPaletteSnapshot {
  const identity = Object.freeze({
    schemaVersion: snapshot.identity.schemaVersion,
    artifactVersion: snapshot.identity.artifactVersion,
    paletteId: snapshot.identity.paletteId,
    paletteVersion: snapshot.identity.paletteVersion,
  });
  const colors = Object.freeze(snapshot.colors.map(copyAndFreezeColor));
  return Object.freeze({
    identity,
    recordCount: snapshot.recordCount,
    activeCount: snapshot.activeCount,
    autoMatchEligibleCount: snapshot.autoMatchEligibleCount,
    colors,
  });
}

function copyAndFreezeColor(
  color: GenerationPaletteColor,
): GenerationPaletteColor {
  return Object.freeze({
    code: color.code,
    hex: color.hex,
    rgb: Object.freeze([color.rgb[0], color.rgb[1], color.rgb[2]] as const),
    lab: Object.freeze([color.lab[0], color.lab[1], color.lab[2]] as const),
    sortOrder: color.sortOrder,
    active: color.active,
    autoMatchEligible: color.autoMatchEligible,
  });
}
