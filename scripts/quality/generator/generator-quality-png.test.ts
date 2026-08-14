import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { decodeGeneratorQualityPng } from "./generator-quality-png.ts";
import type { GeneratorQualityInputDeclaration } from "./generator-quality.types.ts";

describe("external generator-quality PNG decoder", () => {
  it("decodes opaque RGB and verifies dimensions and alpha", () => {
    const bytes = png(2, 1, 2, Buffer.from([0, 10, 20, 30, 40, 50, 60]));
    const result = decodeGeneratorQualityPng(
      bytes,
      declaration("opaque", 2, 1),
    );
    expect([...result.data]).toEqual([10, 20, 30, 255, 40, 50, 60, 255]);
  });

  it("decodes partial-alpha RGBA without compositing hidden RGB", () => {
    const bytes = png(1, 2, 6, Buffer.from([0, 1, 2, 3, 0, 0, 4, 5, 6, 128]));
    const result = decodeGeneratorQualityPng(
      bytes,
      declaration("partial-alpha", 1, 2),
    );
    expect([...result.data]).toEqual([1, 2, 3, 0, 4, 5, 6, 128]);
  });

  it("fails closed on identity, dimensions, alpha, and CRC drift", () => {
    const bytes = png(1, 1, 2, Buffer.from([0, 10, 20, 30]));
    expect(() =>
      decodeGeneratorQualityPng(bytes, declaration("partial-alpha", 1, 1)),
    ).toThrow(/alpha classification/);
    expect(() =>
      decodeGeneratorQualityPng(bytes, declaration("opaque", 2, 1)),
    ).toThrow(/dimensions/);
    const corrupted = Buffer.from(bytes);
    corrupted[corrupted.length - 1] = corrupted[corrupted.length - 1]! ^ 1;
    expect(() =>
      decodeGeneratorQualityPng(corrupted, declaration("opaque", 1, 1)),
    ).toThrow(/CRC/);
  });
});

function declaration(
  alphaClassification: GeneratorQualityInputDeclaration["alphaClassification"],
  width: number,
  height: number,
): GeneratorQualityInputDeclaration {
  return {
    logicalId: "external/test.png",
    sha256: "a".repeat(64),
    dimensions: { width, height },
    alphaClassification,
  };
}

function png(
  width: number,
  height: number,
  colorType: 2 | 6,
  scanlines: Buffer,
): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colorType;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeAndData.copy(output, 4);
  output.writeUInt32BE(crc32(typeAndData), data.length + 8);
  return output;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
