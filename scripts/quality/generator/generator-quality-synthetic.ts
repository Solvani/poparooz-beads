import { createHash } from "node:crypto";

import type { SyntheticGeneratorQualityFixture } from "./generator-quality.types.ts";

const LOGICAL_WIDTH = 24;
const LOGICAL_HEIGHT = 24;
const SCALE = 5;
const WIDTH = LOGICAL_WIDTH * SCALE;
const HEIGHT = LOGICAL_HEIGHT * SCALE;

type MutableFixture = {
  readonly data: Uint8ClampedArray;
  readonly mask: Uint8Array;
};

export const SYNTHETIC_FIXTURE_IDS = Object.freeze([
  "opaque-white-background",
  "pale-subject-light-background",
  "light-subject-touching-edge",
  "transparent-png",
  "binary-alpha",
  "partial-alpha",
  "thin-line",
  "thin-endpoint",
  "antialiased-diagonal",
  "soft-curved-edge",
  "gradient",
  "high-saturation",
  "low-contrast",
  "disconnected-light-region",
  "neutral-fringe",
  "tinted-matte",
  "dark-subject",
  "flat-color-graphic",
] as const);

export function createSyntheticGeneratorQualityFixture(
  id: string,
): SyntheticGeneratorQualityFixture {
  if (!(SYNTHETIC_FIXTURE_IDS as readonly string[]).includes(id)) {
    throw new Error("Unknown synthetic generator-quality fixture.");
  }
  const fixture = canvas(
    id === "transparent-png" || id === "binary-alpha" || id === "partial-alpha",
  );
  drawFixture(id, fixture);
  return Object.freeze({
    id,
    source: Object.freeze({ width: WIDTH, height: HEIGHT, data: fixture.data }),
    referenceOccupancy: fixture.mask,
  });
}

export function hashSyntheticGeneratorQualityFixture(
  fixture: SyntheticGeneratorQualityFixture,
): string {
  const header = Buffer.from(
    `${fixture.source.width}x${fixture.source.height}\n`,
    "utf8",
  );
  return createHash("sha256")
    .update(header)
    .update(fixture.source.data)
    .digest("hex");
}

function canvas(transparent: boolean): MutableFixture {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const mask = new Uint8Array(WIDTH * HEIGHT);
  if (!transparent) data.fill(255);
  return { data, mask };
}

function drawFixture(id: string, fixture: MutableFixture): void {
  switch (id) {
    case "opaque-white-background":
      fillRect(fixture, 6, 6, 12, 12, [35, 70, 120, 255]);
      return;
    case "pale-subject-light-background":
      fillRect(fixture, 5, 5, 14, 14, [238, 229, 214, 255]);
      fillRect(fixture, 9, 9, 6, 6, [120, 90, 70, 255]);
      return;
    case "light-subject-touching-edge":
      fillRect(fixture, 0, 8, 15, 8, [238, 236, 232, 255]);
      fillRect(fixture, 4, 10, 5, 4, [60, 80, 100, 255]);
      return;
    case "transparent-png":
    case "binary-alpha":
      fillRect(fixture, 5, 5, 14, 14, [30, 160, 90, 255]);
      return;
    case "partial-alpha":
      fillRect(fixture, 6, 6, 12, 12, [70, 120, 220, 255]);
      outlineRect(fixture, 5, 5, 14, 14, [70, 120, 220, 96], true);
      return;
    case "thin-line":
      drawLine(fixture, 2, 12, 21, 12, [20, 20, 20, 255]);
      return;
    case "thin-endpoint":
      drawLine(fixture, 4, 19, 19, 4, [25, 25, 25, 255]);
      setPixel(fixture, 19, 3, [25, 25, 25, 255]);
      return;
    case "antialiased-diagonal":
      for (let coordinate = 3; coordinate <= 20; coordinate += 1) {
        setPixel(fixture, coordinate, coordinate, [190, 45, 80, 255]);
        if (coordinate < 20)
          setPixel(fixture, coordinate + 1, coordinate, [190, 45, 80, 96]);
      }
      return;
    case "soft-curved-edge":
      drawDisc(fixture, 12, 12, 7, [40, 130, 190, 255]);
      drawRing(fixture, 12, 12, 8, [40, 130, 190, 112]);
      return;
    case "gradient":
      for (let y = 5; y < 19; y += 1) {
        for (let x = 4; x < 20; x += 1) {
          setPixel(fixture, x, y, [40 + (x - 4) * 10, 80, 180, 255]);
        }
      }
      return;
    case "high-saturation":
      fillRect(fixture, 3, 3, 9, 9, [255, 0, 80, 255]);
      fillRect(fixture, 12, 3, 9, 9, [0, 220, 80, 255]);
      fillRect(fixture, 3, 12, 9, 9, [30, 80, 255, 255]);
      fillRect(fixture, 12, 12, 9, 9, [255, 210, 0, 255]);
      return;
    case "low-contrast":
      fillAll(fixture, [205, 205, 205, 255], true);
      fillRect(fixture, 6, 6, 12, 12, [190, 190, 190, 255]);
      return;
    case "disconnected-light-region":
      outlineRect(fixture, 5, 5, 14, 14, [30, 30, 30, 255], true);
      fillRect(fixture, 9, 9, 6, 6, [255, 255, 255, 255]);
      return;
    case "neutral-fringe":
      fillRect(fixture, 3, 3, 18, 18, [235, 235, 235, 255], false);
      fillRect(fixture, 5, 5, 14, 14, [40, 40, 40, 255]);
      return;
    case "tinted-matte":
      fillRect(fixture, 3, 3, 18, 18, [245, 232, 235, 255]);
      fillRect(fixture, 6, 6, 12, 12, [80, 30, 80, 255]);
      return;
    case "dark-subject":
      fillAll(fixture, [30, 35, 45, 255], true);
      fillRect(fixture, 6, 6, 12, 12, [5, 5, 8, 255]);
      return;
    case "flat-color-graphic":
      fillRect(fixture, 4, 4, 16, 16, [30, 150, 90, 255]);
      fillRect(fixture, 8, 8, 8, 8, [255, 190, 40, 255]);
      return;
    default:
      throw new Error("Unknown synthetic generator-quality fixture.");
  }
}

function fillAll(
  fixture: MutableFixture,
  rgba: readonly [number, number, number, number],
  occupied: boolean,
): void {
  fillRect(fixture, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, rgba, occupied);
}

function fillRect(
  fixture: MutableFixture,
  x: number,
  y: number,
  width: number,
  height: number,
  rgba: readonly [number, number, number, number],
  occupied = true,
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      setPixel(fixture, column, row, rgba, occupied);
    }
  }
}

function outlineRect(
  fixture: MutableFixture,
  x: number,
  y: number,
  width: number,
  height: number,
  rgba: readonly [number, number, number, number],
  occupied: boolean,
): void {
  for (let column = x; column < x + width; column += 1) {
    setPixel(fixture, column, y, rgba, occupied);
    setPixel(fixture, column, y + height - 1, rgba, occupied);
  }
  for (let row = y + 1; row < y + height - 1; row += 1) {
    setPixel(fixture, x, row, rgba, occupied);
    setPixel(fixture, x + width - 1, row, rgba, occupied);
  }
}

function drawLine(
  fixture: MutableFixture,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  rgba: readonly [number, number, number, number],
): void {
  const dx = Math.abs(endX - startX);
  const sx = startX < endX ? 1 : -1;
  const dy = -Math.abs(endY - startY);
  const sy = startY < endY ? 1 : -1;
  let error = dx + dy;
  let x = startX;
  let y = startY;
  while (true) {
    setPixel(fixture, x, y, rgba);
    if (x === endX && y === endY) return;
    const doubled = error * 2;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function drawDisc(
  fixture: MutableFixture,
  centerX: number,
  centerY: number,
  radius: number,
  rgba: readonly [number, number, number, number],
): void {
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) {
        setPixel(fixture, x, y, rgba);
      }
    }
  }
}

function drawRing(
  fixture: MutableFixture,
  centerX: number,
  centerY: number,
  radius: number,
  rgba: readonly [number, number, number, number],
): void {
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (distance > radius - 0.75 && distance < radius + 0.75) {
        setPixel(fixture, x, y, rgba);
      }
    }
  }
}

function setPixel(
  fixture: MutableFixture,
  x: number,
  y: number,
  rgba: readonly [number, number, number, number],
  occupied = true,
): void {
  if (x < 0 || y < 0 || x >= LOGICAL_WIDTH || y >= LOGICAL_HEIGHT) return;
  for (let scaledY = y * SCALE; scaledY < (y + 1) * SCALE; scaledY += 1) {
    for (let scaledX = x * SCALE; scaledX < (x + 1) * SCALE; scaledX += 1) {
      const pixelIndex = scaledY * WIDTH + scaledX;
      const offset = pixelIndex * 4;
      fixture.data.set(rgba, offset);
      if (occupied) fixture.mask[pixelIndex] = 1;
    }
  }
}
