import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";

export const PATTERN_EXPORT_CELL_SIZE = 24;
export const PATTERN_EXPORT_LEFT_MARGIN = 32;
export const PATTERN_EXPORT_RIGHT_MARGIN = 32;
export const PATTERN_EXPORT_TOP_PADDING = 32;
export const PATTERN_EXPORT_BOTTOM_PADDING = 32;
export const PATTERN_EXPORT_LOGO_MAX_HEIGHT = 96;
export const PATTERN_EXPORT_LOGO_TITLE_GAP = 16;
export const PATTERN_EXPORT_TITLE_LINE_HEIGHT = 48;
export const PATTERN_EXPORT_TITLE_METADATA_GAP = 12;
export const PATTERN_EXPORT_METADATA_LINE_HEIGHT = 32;
export const PATTERN_EXPORT_METADATA_ROWS = 3;
export const PATTERN_EXPORT_HEADER_GRID_GAP = 24;
export const PATTERN_EXPORT_GRID_LEGEND_GAP = 32;
export const PATTERN_EXPORT_LEGEND_HEADING_LINE_HEIGHT = 36;
export const PATTERN_EXPORT_HEADING_ENTRIES_GAP = 16;
export const PATTERN_EXPORT_LEGEND_ROW_HEIGHT = 44;
export const PATTERN_EXPORT_LEGEND_COLUMN_GAP = 24;
export const PATTERN_EXPORT_LEGEND_MINIMUM_ITEM_WIDTH = 280;
export const PATTERN_EXPORT_LEGEND_MAXIMUM_COLUMNS = 6;

const LEGEND_SWATCH_SIZE = 30;
const LEGEND_SWATCH_CODE_GAP = 12;
const LEGEND_CODE_SLOT_WIDTH = 56;
const LEGEND_CODE_QUANTITY_GAP = 12;

export interface PatternExportInput {
  readonly pattern: PublicPatternResult;
  readonly selectedColorSetLabel: string;
}

export interface PatternExportLogo {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export interface PatternExportGeometry {
  readonly width: number;
  readonly height: number;
  readonly gridX: number;
  readonly gridY: number;
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly logoWidth: number;
  readonly logoHeight: number;
  readonly legendColumns: number;
  readonly legendRows: number;
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
  logo: PatternExportLogo,
  createCanvas: PatternExportCanvasFactory = createBrowserCanvas,
): PatternExportResult {
  const validation = validateExportInput(input);
  if (!validation.ok) return validation;
  if (!isValidLogo(logo)) {
    return { ok: false, message: SAFE_EXPORT_ERROR };
  }

  const geometry = calculateGeometry(input.pattern, logo);
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
    drawExport(context, input, logo, geometry, validation.colors);
    return {
      ok: true,
      canvas,
      filename: `poparooz-pattern-${input.pattern.matrix.width}x${input.pattern.matrix.height}-code.png`,
      geometry,
    };
  } catch {
    return { ok: false, message: SAFE_EXPORT_ERROR };
  }
}

function isValidLogo(logo: PatternExportLogo): boolean {
  return (
    Number.isFinite(logo.width) &&
    Number.isFinite(logo.height) &&
    logo.width > 0 &&
    logo.height > 0
  );
}

function calculateGeometry(
  pattern: PublicPatternResult,
  logo: PatternExportLogo,
): PatternExportGeometry {
  const gridWidth = pattern.matrix.width * PATTERN_EXPORT_CELL_SIZE;
  const gridHeight = pattern.matrix.height * PATTERN_EXPORT_CELL_SIZE;
  const logoScale = Math.min(1, PATTERN_EXPORT_LOGO_MAX_HEIGHT / logo.height);
  const logoWidth = logo.width * logoScale;
  const logoHeight = logo.height * logoScale;
  const legendColumns = calculateLegendColumns(
    gridWidth,
    pattern.colors.length,
  );
  const legendRows = Math.ceil(pattern.colors.length / legendColumns);
  const gridY =
    PATTERN_EXPORT_TOP_PADDING +
    logoHeight +
    PATTERN_EXPORT_LOGO_TITLE_GAP +
    PATTERN_EXPORT_TITLE_LINE_HEIGHT +
    PATTERN_EXPORT_TITLE_METADATA_GAP +
    PATTERN_EXPORT_METADATA_ROWS * PATTERN_EXPORT_METADATA_LINE_HEIGHT +
    PATTERN_EXPORT_HEADER_GRID_GAP;
  return Object.freeze({
    width: PATTERN_EXPORT_LEFT_MARGIN + gridWidth + PATTERN_EXPORT_RIGHT_MARGIN,
    height:
      gridY +
      gridHeight +
      PATTERN_EXPORT_GRID_LEGEND_GAP +
      PATTERN_EXPORT_LEGEND_HEADING_LINE_HEIGHT +
      PATTERN_EXPORT_HEADING_ENTRIES_GAP +
      legendRows * PATTERN_EXPORT_LEGEND_ROW_HEIGHT +
      PATTERN_EXPORT_BOTTOM_PADDING,
    gridX: PATTERN_EXPORT_LEFT_MARGIN,
    gridY,
    gridWidth,
    gridHeight,
    logoWidth,
    logoHeight,
    legendColumns,
    legendRows,
  });
}

function calculateLegendColumns(gridWidth: number, colorsUsed: number): number {
  const widthBound = Math.floor(
    (gridWidth + PATTERN_EXPORT_LEGEND_COLUMN_GAP) /
      (PATTERN_EXPORT_LEGEND_MINIMUM_ITEM_WIDTH +
        PATTERN_EXPORT_LEGEND_COLUMN_GAP),
  );
  return Math.max(
    1,
    Math.min(PATTERN_EXPORT_LEGEND_MAXIMUM_COLUMNS, colorsUsed, widthBound),
  );
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
  logo: PatternExportLogo,
  geometry: PatternExportGeometry,
  colors: ReadonlyMap<number, PublicPatternResult["colors"][number]>,
) {
  const { pattern, selectedColorSetLabel } = input;
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, geometry.width, geometry.height);
  context.drawImage(
    logo.source,
    PATTERN_EXPORT_LEFT_MARGIN,
    PATTERN_EXPORT_TOP_PADDING,
    geometry.logoWidth,
    geometry.logoHeight,
  );

  const titleY =
    PATTERN_EXPORT_TOP_PADDING +
    geometry.logoHeight +
    PATTERN_EXPORT_LOGO_TITLE_GAP;
  context.fillStyle = "#17231E";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = "700 40px system-ui, sans-serif";
  context.fillText("Color Code Pattern", PATTERN_EXPORT_LEFT_MARGIN, titleY);

  const metadataY =
    titleY +
    PATTERN_EXPORT_TITLE_LINE_HEIGHT +
    PATTERN_EXPORT_TITLE_METADATA_GAP;
  context.font = "600 24px system-ui, sans-serif";
  context.fillText(
    `Pattern Size: ${pattern.matrix.width} × ${pattern.matrix.height}`,
    PATTERN_EXPORT_LEFT_MARGIN,
    metadataY,
  );
  context.fillText(
    `Colors Used: ${pattern.totals.colorCount} · Total Beads: ${pattern.totals.totalBeads.toLocaleString("en-US")}`,
    PATTERN_EXPORT_LEFT_MARGIN,
    metadataY + PATTERN_EXPORT_METADATA_LINE_HEIGHT,
  );
  context.fillText(
    `Bead Color Set: ${selectedColorSetLabel}`,
    PATTERN_EXPORT_LEFT_MARGIN,
    metadataY + PATTERN_EXPORT_METADATA_LINE_HEIGHT * 2,
  );

  drawPatternGrid(context, pattern, geometry, colors);
  drawLegend(context, pattern, geometry);
}

function drawPatternGrid(
  context: CanvasRenderingContext2D,
  pattern: PublicPatternResult,
  geometry: PatternExportGeometry,
  colors: ReadonlyMap<number, PublicPatternResult["colors"][number]>,
) {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 8px system-ui, sans-serif";
  for (let row = 0; row < pattern.matrix.height; row += 1) {
    for (let column = 0; column < pattern.matrix.width; column += 1) {
      const colorIndex =
        pattern.matrix.colorIndices[row * pattern.matrix.width + column]!;
      const x = geometry.gridX + column * PATTERN_EXPORT_CELL_SIZE;
      const y = geometry.gridY + row * PATTERN_EXPORT_CELL_SIZE;
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
}

function drawLegend(
  context: CanvasRenderingContext2D,
  pattern: PublicPatternResult,
  geometry: PatternExportGeometry,
) {
  const legendY =
    geometry.gridY + geometry.gridHeight + PATTERN_EXPORT_GRID_LEGEND_GAP;
  context.fillStyle = "#17231E";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = "700 28px system-ui, sans-serif";
  context.fillText("Bead Requirements", PATTERN_EXPORT_LEFT_MARGIN, legendY);

  const entriesY =
    legendY +
    PATTERN_EXPORT_LEGEND_HEADING_LINE_HEIGHT +
    PATTERN_EXPORT_HEADING_ENTRIES_GAP;
  const columnWidth =
    (geometry.gridWidth -
      (geometry.legendColumns - 1) * PATTERN_EXPORT_LEGEND_COLUMN_GAP) /
    geometry.legendColumns;
  pattern.colors.forEach((entry, index) => {
    const column = index % geometry.legendColumns;
    const row = Math.floor(index / geometry.legendColumns);
    const x =
      PATTERN_EXPORT_LEFT_MARGIN +
      column * (columnWidth + PATTERN_EXPORT_LEGEND_COLUMN_GAP);
    const rowTop = entriesY + row * PATTERN_EXPORT_LEGEND_ROW_HEIGHT;
    const centerY = rowTop + PATTERN_EXPORT_LEGEND_ROW_HEIGHT / 2;
    context.fillStyle = entry.color.hex;
    context.fillRect(
      x,
      rowTop + (PATTERN_EXPORT_LEGEND_ROW_HEIGHT - LEGEND_SWATCH_SIZE) / 2,
      LEGEND_SWATCH_SIZE,
      LEGEND_SWATCH_SIZE,
    );
    context.strokeStyle = "#89958F";
    context.strokeRect(
      x + 0.5,
      rowTop +
        (PATTERN_EXPORT_LEGEND_ROW_HEIGHT - LEGEND_SWATCH_SIZE) / 2 +
        0.5,
      LEGEND_SWATCH_SIZE - 1,
      LEGEND_SWATCH_SIZE - 1,
    );
    context.fillStyle = "#17231E";
    context.textBaseline = "middle";
    context.font = "700 22px system-ui, sans-serif";
    const codeX = x + LEGEND_SWATCH_SIZE + LEGEND_SWATCH_CODE_GAP;
    context.fillText(entry.color.code, codeX, centerY, LEGEND_CODE_SLOT_WIDTH);
    context.font = "500 18px system-ui, sans-serif";
    context.fillText(
      `${entry.beadCount.toLocaleString("en-US")} beads`,
      codeX + LEGEND_CODE_SLOT_WIDTH + LEGEND_CODE_QUANTITY_GAP,
      centerY,
      Math.max(
        1,
        columnWidth -
          LEGEND_SWATCH_SIZE -
          LEGEND_SWATCH_CODE_GAP -
          LEGEND_CODE_SLOT_WIDTH -
          LEGEND_CODE_QUANTITY_GAP,
      ),
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
