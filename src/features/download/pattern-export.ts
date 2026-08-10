import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";

export const PATTERN_EXPORT_CELL_SIZE = 24;
export const PATTERN_EXPORT_MARGIN = 32;
export const PATTERN_EXPORT_HEADER_HEIGHT = 160;
export const PATTERN_EXPORT_LEGEND_ROW_HEIGHT = 36;
export const PATTERN_EXPORT_LEGEND_COLUMNS = 3;

export interface PatternExportInput {
  readonly pattern: PublicPatternResult;
  readonly selectedColorSetLabel: string;
}

export interface PatternExportGeometry {
  readonly width: number;
  readonly height: number;
  readonly gridWidth: number;
  readonly gridHeight: number;
}

export type PatternExportResult =
  | {
      readonly ok: true;
      readonly canvas: HTMLCanvasElement;
      readonly filename: string;
      readonly geometry: PatternExportGeometry;
    }
  | { readonly ok: false; readonly message: string };

export type PatternExportCanvasFactory = (
  width: number,
  height: number,
) => HTMLCanvasElement | null;

const SAFE_EXPORT_ERROR = "We couldn’t prepare this pattern download.";

export function renderPatternExport(
  input: PatternExportInput,
  createCanvas: PatternExportCanvasFactory = createBrowserCanvas,
): PatternExportResult {
  const validation = validateExportInput(input);
  if (!validation.ok) return validation;

  const { pattern } = input;
  const gridWidth = pattern.matrix.width * PATTERN_EXPORT_CELL_SIZE;
  const gridHeight = pattern.matrix.height * PATTERN_EXPORT_CELL_SIZE;
  const legendRows = Math.ceil(
    pattern.colors.length / PATTERN_EXPORT_LEGEND_COLUMNS,
  );
  const legendHeight = 56 + legendRows * PATTERN_EXPORT_LEGEND_ROW_HEIGHT;
  const geometry = Object.freeze({
    width: PATTERN_EXPORT_MARGIN * 2 + gridWidth,
    height:
      PATTERN_EXPORT_MARGIN * 2 +
      PATTERN_EXPORT_HEADER_HEIGHT +
      gridHeight +
      legendHeight,
    gridWidth,
    gridHeight,
  });

  let canvas: HTMLCanvasElement | null;
  try {
    canvas = createCanvas(geometry.width, geometry.height);
  } catch {
    return { ok: false, message: SAFE_EXPORT_ERROR };
  }
  if (canvas === null) return { ok: false, message: SAFE_EXPORT_ERROR };
  canvas.width = geometry.width;
  canvas.height = geometry.height;
  const context = canvas.getContext("2d");
  if (context === null) return { ok: false, message: SAFE_EXPORT_ERROR };

  try {
    drawExport(context, input, geometry, validation.colors);
    return {
      ok: true,
      canvas,
      filename: `poparooz-pattern-${pattern.matrix.width}x${pattern.matrix.height}-code.png`,
      geometry,
    };
  } catch {
    return { ok: false, message: SAFE_EXPORT_ERROR };
  }
}

function validateExportInput(input: PatternExportInput):
  | {
      readonly ok: true;
      readonly colors: ReadonlyMap<
        number,
        PublicPatternResult["colors"][number]
      >;
    }
  | { readonly ok: false; readonly message: string } {
  const { matrix, totals, colors } = input.pattern;
  if (
    !Number.isSafeInteger(matrix.width) ||
    !Number.isSafeInteger(matrix.height) ||
    matrix.width <= 0 ||
    matrix.height <= 0 ||
    matrix.width > 104 ||
    matrix.height > 104 ||
    !(matrix.colorIndices instanceof Uint16Array) ||
    matrix.colorIndices.length !== matrix.width * matrix.height ||
    !/^\d{2,3}-Color Set$/.test(input.selectedColorSetLabel) ||
    totals.width !== matrix.width ||
    totals.height !== matrix.height ||
    totals.colorCount !== colors.length ||
    colors.reduce((sum, entry) => sum + entry.beadCount, 0) !==
      totals.totalBeads
  ) {
    return { ok: false, message: SAFE_EXPORT_ERROR };
  }

  const colorMap = new Map<number, PublicPatternResult["colors"][number]>();
  for (const entry of colors) {
    if (
      !Number.isSafeInteger(entry.index) ||
      entry.index < 0 ||
      colorMap.has(entry.index) ||
      entry.color.brand !== "Poparooz" ||
      !/^#[0-9A-F]{6}$/.test(entry.color.hex) ||
      !/^[A-HM]\d{1,2}$/.test(entry.color.code) ||
      !Number.isSafeInteger(entry.beadCount) ||
      entry.beadCount <= 0
    ) {
      return { ok: false, message: SAFE_EXPORT_ERROR };
    }
    colorMap.set(entry.index, entry);
  }
  for (const colorIndex of matrix.colorIndices) {
    if (colorIndex !== matrix.transparentIndex && !colorMap.has(colorIndex)) {
      return { ok: false, message: SAFE_EXPORT_ERROR };
    }
  }
  return { ok: true, colors: colorMap };
}

function drawExport(
  context: CanvasRenderingContext2D,
  input: PatternExportInput,
  geometry: PatternExportGeometry,
  colors: ReadonlyMap<number, PublicPatternResult["colors"][number]>,
) {
  const { pattern, selectedColorSetLabel } = input;
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, geometry.width, geometry.height);
  context.fillStyle = "#294D3D";
  context.font = "800 30px system-ui, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText("Poparooz", PATTERN_EXPORT_MARGIN, 58);
  context.fillStyle = "#17231E";
  context.font = "700 20px system-ui, sans-serif";
  context.fillText("Color Code Pattern", PATTERN_EXPORT_MARGIN, 91);
  context.font = "500 15px system-ui, sans-serif";
  context.fillText(
    `Pattern Size: ${pattern.matrix.width} × ${pattern.matrix.height}`,
    PATTERN_EXPORT_MARGIN,
    122,
  );
  context.fillText(
    `Selected Bead Color Set: ${selectedColorSetLabel}`,
    PATTERN_EXPORT_MARGIN + geometry.gridWidth / 2,
    122,
  );
  context.fillText(
    `Actual Colors: ${pattern.totals.colorCount} · Total Beads: ${pattern.totals.totalBeads.toLocaleString("en-US")}`,
    PATTERN_EXPORT_MARGIN,
    148,
  );

  const gridX = PATTERN_EXPORT_MARGIN;
  const gridY = PATTERN_EXPORT_MARGIN + PATTERN_EXPORT_HEADER_HEIGHT;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 8px system-ui, sans-serif";
  for (let row = 0; row < pattern.matrix.height; row += 1) {
    for (let column = 0; column < pattern.matrix.width; column += 1) {
      const colorIndex =
        pattern.matrix.colorIndices[row * pattern.matrix.width + column]!;
      const x = gridX + column * PATTERN_EXPORT_CELL_SIZE;
      const y = gridY + row * PATTERN_EXPORT_CELL_SIZE;
      const color = colors.get(colorIndex);
      context.fillStyle = color?.color.hex ?? "#F3F4F1";
      context.fillRect(
        x,
        y,
        PATTERN_EXPORT_CELL_SIZE,
        PATTERN_EXPORT_CELL_SIZE,
      );
      context.strokeStyle = "#AAB5AF";
      context.lineWidth = 1;
      context.strokeRect(
        x + 0.5,
        y + 0.5,
        PATTERN_EXPORT_CELL_SIZE - 1,
        PATTERN_EXPORT_CELL_SIZE - 1,
      );
      if (color !== undefined) {
        context.save();
        context.beginPath();
        context.rect(x, y, PATTERN_EXPORT_CELL_SIZE, PATTERN_EXPORT_CELL_SIZE);
        context.clip();
        context.fillStyle = readableTextColor(color.color.hex);
        context.fillText(
          color.color.code,
          x + PATTERN_EXPORT_CELL_SIZE / 2,
          y + PATTERN_EXPORT_CELL_SIZE / 2,
          PATTERN_EXPORT_CELL_SIZE - 4,
        );
        context.restore();
      }
    }
  }

  const legendY = gridY + geometry.gridHeight + 40;
  context.fillStyle = "#17231E";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = "700 18px system-ui, sans-serif";
  context.fillText("Bead Requirements", PATTERN_EXPORT_MARGIN, legendY);
  const columnWidth = geometry.gridWidth / PATTERN_EXPORT_LEGEND_COLUMNS;
  context.font = "600 14px system-ui, sans-serif";
  pattern.colors.forEach((entry, index) => {
    const column = index % PATTERN_EXPORT_LEGEND_COLUMNS;
    const row = Math.floor(index / PATTERN_EXPORT_LEGEND_COLUMNS);
    const x = PATTERN_EXPORT_MARGIN + column * columnWidth;
    const y = legendY + 28 + row * PATTERN_EXPORT_LEGEND_ROW_HEIGHT;
    context.fillStyle = entry.color.hex;
    context.fillRect(x, y - 17, 20, 20);
    context.strokeStyle = "#89958F";
    context.strokeRect(x + 0.5, y - 16.5, 19, 19);
    context.fillStyle = "#17231E";
    context.fillText(
      `${entry.color.code}  ${entry.beadCount.toLocaleString("en-US")} beads`,
      x + 30,
      y,
      Math.max(1, columnWidth - 36),
    );
  });
}

function readableTextColor(hex: string): "#111111" | "#FFFFFF" {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 150
    ? "#111111"
    : "#FFFFFF";
}

function createBrowserCanvas(
  width: number,
  height: number,
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
