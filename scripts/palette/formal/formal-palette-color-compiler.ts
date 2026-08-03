import { rgb8ToLab } from "../../../src/domain/color/color-conversion.ts";
import type {
  CompiledFormalPaletteColorCore,
  NormalizedFormalPalette,
  NormalizedFormalPaletteColor,
} from "./formal-palette.types.ts";

export function hexToRgb8Tuple(
  hex: NormalizedFormalPaletteColor["hex"],
): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

export function compileFormalPaletteColors(
  palette: NormalizedFormalPalette,
): readonly CompiledFormalPaletteColorCore[] {
  const businessOrderedColors = [...palette.colors].sort(
    (left, right) =>
      left.seriesRank - right.seriesRank ||
      left.seriesNumber - right.seriesNumber ||
      (left.code < right.code ? -1 : left.code > right.code ? 1 : 0),
  );

  return businessOrderedColors.map((color, sortOrder) => {
    const rgb = hexToRgb8Tuple(color.hex);
    const lab = rgb8ToLab({ r: rgb[0], g: rgb[1], b: rgb[2] });
    return {
      code: color.code,
      referenceSystem: "POPAROOZ",
      referenceCode: color.code,
      displayCode: color.code,
      ...(color.displayName === undefined
        ? {}
        : { displayName: color.displayName }),
      hex: color.hex,
      rgb,
      lab: [lab.l, lab.a, lab.b],
      sortOrder,
    };
  });
}
