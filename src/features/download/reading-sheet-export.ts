import {
  validateExportInput,
  type PatternExportInput,
  type PatternExportLogo,
  type PatternExportResult,
  type PatternExportCanvasFactory,
} from "./pattern-export";
import {
  getReadingGuides,
  readingSheetFilename,
  segmentPatternIntoReadingSheets,
} from "./reading-sheets";

export const READING_CELL_PX = 24;
export const READING_AXIS_PX = 28;
export const READING_GRID_X = 60;
export const READING_GRID_Y = 328;
const ink = "#17231E";
export function renderReadingSheetExport(
  input: PatternExportInput,
  logo: PatternExportLogo,
  createCanvas: PatternExportCanvasFactory = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  },
): PatternExportResult {
  const validated = validateExportInput(input);
  if (!validated.ok) return validated;
  try {
    if (
      !Number.isFinite(logo.width) ||
      !Number.isFinite(logo.height) ||
      logo.width <= 0 ||
      logo.height <= 0
    )
      throw new Error("Invalid logo.");
    const sheets = segmentPatternIntoReadingSheets(input.pattern);
    const target = input.readingSheet ?? sheets[0]!.sectionId;
    const sheet = sheets.find((s) => s.sectionId === target);
    const overview = target === "overview";
    if (!overview && !sheet) throw new Error("Unknown sheet.");
    const gridWidth = overview
      ? Math.min(624, input.pattern.matrix.width * 12)
      : sheet!.width * READING_CELL_PX;
    const gridHeight = overview
      ? (gridWidth * input.pattern.matrix.height) / input.pattern.matrix.width
      : sheet!.height * READING_CELL_PX;
    const width = Math.max(640, gridWidth + READING_GRID_X + 60);
    const legend = overview ? [] : sheet!.perColorBeadCounts;
    const legendColumns = Math.max(1, Math.floor((width - 64) / 260));
    const legendRows = Math.ceil(legend.length / legendColumns);
    const height =
      READING_GRID_Y + gridHeight + READING_AXIS_PX + 64 + legendRows * 44 + 48;
    const scale = Math.min(1, 64 / logo.height);
    const geometry = Object.freeze({
      width,
      height,
      gridX: READING_GRID_X,
      gridY: READING_GRID_Y,
      gridWidth,
      gridHeight,
      logoWidth: logo.width * scale,
      logoHeight: logo.height * scale,
      legendColumns,
      legendRows,
    });
    const canvas = createCanvas(width, height);
    if (!canvas) throw new Error("Canvas unavailable.");
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Context unavailable.");
    c.fillStyle = "#FFFFFF";
    c.fillRect(0, 0, width, height);
    c.drawImage(logo.source, 32, 24, geometry.logoWidth, geometry.logoHeight);
    c.fillStyle = ink;
    c.textAlign = "left";
    c.textBaseline = "top";
    c.font = "700 30px system-ui, sans-serif";
    c.fillText(
      overview
        ? "Pattern Overview"
        : `Pattern Sheet · Section ${sheet!.sectionId}`,
      32,
      106,
    );
    c.font = "600 20px system-ui, sans-serif";
    const board = input.pattern.boardLayout;
    const lines = overview
      ? [
          `Whole pattern: ${input.pattern.matrix.width} × ${input.pattern.matrix.height} · Reading sheets: ${sheets.length}`,
          `Required Board Layout: ${board.boardCount} × poparooz-board-104`,
          `${sheets.length} reading sections are not ${sheets.length} physical boards.`,
          "Use the separate section PNGs to read bead codes.",
          "PNG reading aid · Not a calibrated actual-size print",
        ]
      : [
          `Global X: ${sheet!.globalStartX}–${sheet!.globalEndX} · Global Y: ${sheet!.globalStartY}–${sheet!.globalEndY}`,
          `Local grid: ${sheet!.width} × ${sheet!.height} · Sheet beads: ${sheet!.totalBeads.toLocaleString("en-US")}`,
          `Required Board Layout: ${board.boardCount} × poparooz-board-104 · Reading sheets: ${sheets.length}`,
          "5-cell helpers · 10-cell major guides · Not extra boards",
          "PNG reading aid · Not a calibrated actual-size print",
        ];
    lines.forEach((t, i) => c.fillText(t, 32, 156 + i * 28, width - 64));
    const colors = validated.materialsByIndex;
    if (overview) {
      const cell = gridWidth / input.pattern.matrix.width;
      for (let y = 0; y < input.pattern.matrix.height; y++)
        for (let x = 0; x < input.pattern.matrix.width; x++) {
          const index =
            input.pattern.matrix.colorIndices[
              y * input.pattern.matrix.width + x
            ]!;
          c.fillStyle = colors.get(index)?.color.hex ?? "#F3F4F1";
          c.fillRect(
            READING_GRID_X + x * cell,
            READING_GRID_Y + y * cell,
            cell,
            cell,
          );
        }
      for (const s of sheets) {
        const x = READING_GRID_X + (s.globalStartX - 1) * cell,
          y = READING_GRID_Y + (s.globalStartY - 1) * cell;
        c.strokeStyle = ink;
        c.lineWidth = 3;
        c.strokeRect(x, y, s.width * cell, s.height * cell);
        c.fillStyle = "#FFFFFF";
        c.fillRect(x + 4, y + 4, 52, 30);
        c.fillStyle = ink;
        c.font = "700 20px system-ui, sans-serif";
        c.fillText(s.sectionId, x + 8, y + 8);
      }
    } else {
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = "700 9px system-ui, sans-serif";
      for (let y = 0; y < sheet!.height; y++)
        for (let x = 0; x < sheet!.width; x++) {
          const index = sheet!.cells[y * sheet!.width + x]!;
          const material = colors.get(index);
          const px = READING_GRID_X + x * 24,
            py = READING_GRID_Y + y * 24;
          c.fillStyle = material?.color.hex ?? "#F3F4F1";
          c.fillRect(px, py, 24, 24);
          c.strokeStyle = "#AAB5AF";
          c.lineWidth = 1;
          c.strokeRect(px + 0.5, py + 0.5, 23, 23);
          if (material) {
            const hex = material.color.hex;
            c.fillStyle =
              (parseInt(hex.slice(1, 3), 16) * 299 +
                parseInt(hex.slice(3, 5), 16) * 587 +
                parseInt(hex.slice(5, 7), 16) * 114) /
                1000 >=
              150
                ? "#111111"
                : "#FFFFFF";
            c.fillText(material.color.code, px + 12, py + 12, 20);
          }
        }
      for (const g of getReadingGuides(sheet!.width)) {
        c.fillStyle = g.kind === "major" ? ink : "#66776D";
        c.fillRect(
          READING_GRID_X + g.position * 24 - g.thickness / 2,
          READING_GRID_Y,
          g.thickness,
          gridHeight,
        );
      }
      for (const g of getReadingGuides(sheet!.height)) {
        c.fillStyle = g.kind === "major" ? ink : "#66776D";
        c.fillRect(
          READING_GRID_X,
          READING_GRID_Y + g.position * 24 - g.thickness / 2,
          gridWidth,
          g.thickness,
        );
      }
      c.strokeStyle = ink;
      c.lineWidth = 4;
      c.strokeRect(
        READING_GRID_X + 2,
        READING_GRID_Y + 2,
        gridWidth - 4,
        gridHeight - 4,
      );
      c.fillStyle = ink;
      c.font = "500 10px system-ui, sans-serif";
      for (let x = 0; x < sheet!.width; x++) {
        c.fillText(
          String(x + 1),
          READING_GRID_X + x * 24 + 12,
          READING_GRID_Y - 14,
        );
        c.fillText(
          String(x + 1),
          READING_GRID_X + x * 24 + 12,
          READING_GRID_Y + gridHeight + 14,
        );
      }
      for (let y = 0; y < sheet!.height; y++) {
        c.fillText(
          String(y + 1),
          READING_GRID_X - 14,
          READING_GRID_Y + y * 24 + 12,
        );
        c.fillText(
          String(y + 1),
          READING_GRID_X + gridWidth + 14,
          READING_GRID_Y + y * 24 + 12,
        );
      }
      const legendY = READING_GRID_Y + gridHeight + READING_AXIS_PX + 32;
      c.textAlign = "left";
      c.textBaseline = "top";
      c.fillStyle = ink;
      c.font = "700 24px system-ui, sans-serif";
      c.fillText("Sheet Legend · Local Bead Counts", 32, legendY, width - 64);
      legend.forEach((m, i) => {
        const material = colors.get(m.patternColorIndex)!;
        const x = 32 + ((i % legendColumns) * (width - 64)) / legendColumns,
          y = legendY + 40 + Math.floor(i / legendColumns) * 44;
        c.fillStyle = material.color.hex;
        c.fillRect(x, y, 28, 28);
        c.strokeStyle = "#89958F";
        c.lineWidth = 1;
        c.strokeRect(x, y, 28, 28);
        c.fillStyle = ink;
        c.font = "700 18px system-ui, sans-serif";
        c.fillText(
          `${material.color.code}    ${m.beadCount.toLocaleString("en-US")} beads`,
          x + 40,
          y + 4,
          210,
        );
      });
      if (legend.length === 0) {
        c.font = "500 18px system-ui, sans-serif";
        c.fillText("No beads in this reading sheet.", 32, legendY + 40);
      }
    }
    return {
      ok: true,
      canvas,
      filename: readingSheetFilename(target),
      geometry,
    };
  } catch {
    return { ok: false, message: "We couldn’t prepare this pattern download." };
  }
}
