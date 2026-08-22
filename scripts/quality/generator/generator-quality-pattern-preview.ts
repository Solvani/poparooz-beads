import { deflateSync } from "node:zlib";

import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";

export function renderPatternComparisonPng(
  baseline: PublicPatternResult,
  candidate: PublicPatternResult,
  cellSize = 4,
  gap = 24,
): Buffer {
  if (
    baseline.matrix.width !== candidate.matrix.width ||
    baseline.matrix.height !== candidate.matrix.height
  ) {
    throw new Error("Pattern preview dimensions differ.");
  }
  const panelWidth = baseline.matrix.width * cellSize;
  const width = panelWidth * 2 + gap;
  const height = baseline.matrix.height * cellSize;
  const rgba = new Uint8Array(width * height * 4);
  fill(rgba, width, height, [238, 238, 238, 255]);
  drawPattern(rgba, width, baseline, 0, cellSize);
  drawPattern(rgba, width, candidate, panelWidth + gap, cellSize);
  fillRectangle(rgba, width, panelWidth, 0, gap, height, [80, 80, 80, 255]);
  return encodeRgbaPng(width, height, rgba);
}

export function renderPatternGridPng(
  patterns: readonly PublicPatternResult[],
  columns: number,
  cellSize = 4,
  gap = 16,
): Buffer {
  if (
    patterns.length === 0 ||
    !Number.isSafeInteger(columns) ||
    columns <= 0 ||
    patterns.some(
      (pattern) =>
        pattern.matrix.width !== patterns[0]!.matrix.width ||
        pattern.matrix.height !== patterns[0]!.matrix.height,
    )
  ) {
    throw new Error("Pattern preview grid input is invalid.");
  }
  const rows = Math.ceil(patterns.length / columns);
  const panelWidth = patterns[0]!.matrix.width * cellSize;
  const panelHeight = patterns[0]!.matrix.height * cellSize;
  const width = panelWidth * columns + gap * (columns - 1);
  const height = panelHeight * rows + gap * (rows - 1);
  const rgba = new Uint8Array(width * height * 4);
  fill(rgba, width, height, [80, 80, 80, 255]);
  patterns.forEach((pattern, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawPattern(
      rgba,
      width,
      pattern,
      column * (panelWidth + gap),
      cellSize,
      row * (panelHeight + gap),
    );
  });
  return encodeRgbaPng(width, height, rgba);
}

function drawPattern(
  output: Uint8Array,
  outputWidth: number,
  pattern: PublicPatternResult,
  offsetX: number,
  cellSize: number,
  offsetY = 0,
): void {
  const colorByIndex = new Map(
    pattern.colors.map((item) => [item.index, hexRgb(item.color.hex)] as const),
  );
  for (let index = 0; index < pattern.matrix.colorIndices.length; index += 1) {
    const colorIndex = pattern.matrix.colorIndices[index]!;
    if (colorIndex === pattern.matrix.transparentIndex) continue;
    const color = colorByIndex.get(colorIndex);
    if (color === undefined)
      throw new Error("Pattern preview color is missing.");
    const x = offsetX + (index % pattern.matrix.width) * cellSize;
    const y = offsetY + Math.floor(index / pattern.matrix.width) * cellSize;
    fillRectangle(output, outputWidth, x, y, cellSize, cellSize, [
      color[0],
      color[1],
      color[2],
      255,
    ]);
  }
}

function encodeRgbaPng(
  width: number,
  height: number,
  rgba: Uint8Array,
): Buffer {
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const destination = y * (width * 4 + 1);
    scanlines[destination] = 0;
    scanlines.set(
      rgba.subarray(y * width * 4, (y + 1) * width * 4),
      destination + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(scanlines)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBytes.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(
    crc32(Buffer.concat([typeBytes, data])),
    8 + data.length,
  );
  return result;
}

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (const value of input) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function fill(
  output: Uint8Array,
  width: number,
  height: number,
  color: readonly [number, number, number, number],
): void {
  fillRectangle(output, width, 0, 0, width, height, color);
}

function fillRectangle(
  output: Uint8Array,
  outputWidth: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: readonly [number, number, number, number],
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      output.set(color, (row * outputWidth + column) * 4);
    }
  }
}

function hexRgb(hex: string): readonly [number, number, number] {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error("Pattern preview HEX is invalid.");
  }
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}
