import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { PatternRaster } from "./pattern-canvas.types";

export const TRANSPARENT_CELL_LIGHT = "#F3F4F1";
export const TRANSPARENT_CELL_DARK = "#E3E7E4";
export const MAX_PATTERN_DIMENSION = 4096;
export const MAX_PATTERN_CELLS = 16_777_216;

export type PatternRasterResult =
  | { readonly ok: true; readonly raster: PatternRaster }
  | { readonly ok: false };

export interface PatternRasterSurface {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
}

export type PatternRasterSurfaceFactory = (
  width: number,
  height: number,
) => PatternRasterSurface | null;

export function buildPatternRaster(
  pattern: PublicPatternResult,
  createSurface: PatternRasterSurfaceFactory = createBrowserSurface,
): PatternRasterResult {
  const { width, height, colorIndices, transparentIndex } = pattern.matrix;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_PATTERN_DIMENSION ||
    height > MAX_PATTERN_DIMENSION ||
    width > Math.floor(Number.MAX_SAFE_INTEGER / height) ||
    width * height > MAX_PATTERN_CELLS ||
    !(colorIndices instanceof Uint16Array) ||
    colorIndices.length !== width * height
  ) {
    return { ok: false };
  }

  const colorBytes = createColorBytes(pattern);
  if (colorBytes === null) return { ok: false };
  let surface: PatternRasterSurface | null;
  try {
    surface = createSurface(width, height);
  } catch {
    return { ok: false };
  }
  if (surface === null) return { ok: false };

  try {
    const pixels = surface.context.createImageData(width, height);
    const transparentLight = hexToBytes(TRANSPARENT_CELL_LIGHT)!;
    const transparentDark = hexToBytes(TRANSPARENT_CELL_DARK)!;
    for (let position = 0; position < colorIndices.length; position += 1) {
      const colorIndex = colorIndices[position]!;
      const destination = position * 4;
      if (colorIndex === transparentIndex) {
        const x = position % width;
        const y = Math.floor(position / width);
        const empty = (x + y) % 2 === 0 ? transparentLight : transparentDark;
        pixels.data.set(empty, destination);
      } else {
        const color = colorBytes.get(colorIndex);
        if (color === undefined) return { ok: false };
        pixels.data.set(color, destination);
      }
      pixels.data[destination + 3] = 255;
    }
    surface.context.putImageData(pixels, 0, 0);
    return {
      ok: true,
      raster: Object.freeze({ source: surface.canvas, width, height }),
    };
  } catch {
    return { ok: false };
  }
}

function createColorBytes(
  pattern: PublicPatternResult,
): ReadonlyMap<number, Uint8ClampedArray> | null {
  const colors = new Map<number, Uint8ClampedArray>();
  for (const entry of pattern.colors) {
    if (
      !Number.isSafeInteger(entry.index) ||
      entry.index < 0 ||
      colors.has(entry.index)
    ) {
      return null;
    }
    const bytes = hexToBytes(entry.color.hex);
    if (bytes === null) return null;
    colors.set(entry.index, bytes);
  }
  return colors;
}

function hexToBytes(hex: string): Uint8ClampedArray | null {
  if (!/^#[0-9A-F]{6}$/.test(hex)) return null;
  return new Uint8ClampedArray([
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]);
}

function createBrowserSurface(
  width: number,
  height: number,
): PatternRasterSurface | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  return context === null ? null : { canvas, context };
}
