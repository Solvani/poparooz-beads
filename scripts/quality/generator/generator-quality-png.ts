import { inflateSync } from "node:zlib";

import type { RgbaImage } from "../../../src/domain/image/image.types.ts";
import type { GeneratorQualityInputDeclaration } from "./generator-quality.types.ts";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodeGeneratorQualityPng(
  bytes: Buffer,
  declaration: GeneratorQualityInputDeclaration,
): RgbaImage {
  if (
    bytes.length < PNG_SIGNATURE.length ||
    !bytes.subarray(0, 8).equals(PNG_SIGNATURE)
  ) {
    throw new Error("External quality input is not a PNG file.");
  }

  let offset = 8;
  let header: PngHeader | undefined;
  const compressed: Buffer[] = [];
  let ended = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error("PNG chunk is truncated.");
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;
    if (crcEnd > bytes.length) throw new Error("PNG chunk is truncated.");
    const data = bytes.subarray(dataStart, dataEnd);
    verifyChunkCrc(
      bytes.subarray(offset + 4, dataEnd),
      bytes.readUInt32BE(dataEnd),
    );
    if (type === "IHDR") {
      if (header !== undefined || length !== 13)
        throw new Error("PNG IHDR is invalid.");
      header = parseHeader(data);
    } else if (type === "IDAT") {
      compressed.push(data);
    } else if (type === "IEND") {
      ended = true;
      offset = crcEnd;
      break;
    }
    offset = crcEnd;
  }
  if (
    header === undefined ||
    compressed.length === 0 ||
    !ended ||
    offset !== bytes.length
  ) {
    throw new Error("PNG structure is incomplete or has trailing bytes.");
  }
  if (
    declaration.dimensions === undefined ||
    declaration.dimensions.width !== header.width ||
    declaration.dimensions.height !== header.height
  ) {
    throw new Error("External PNG dimensions do not match the manifest.");
  }

  const channels = header.colorType === 2 ? 3 : 4;
  const rowBytes = header.width * channels;
  const inflated = inflateSync(Buffer.concat(compressed));
  if (inflated.length !== (rowBytes + 1) * header.height) {
    throw new Error("PNG decompressed byte length is invalid.");
  }
  const raw = unfilter(inflated, header.width, header.height, channels);
  const rgba = new Uint8ClampedArray(header.width * header.height * 4);
  for (let source = 0, target = 0; source < raw.length; source += channels) {
    rgba[target++] = raw[source]!;
    rgba[target++] = raw[source + 1]!;
    rgba[target++] = raw[source + 2]!;
    rgba[target++] = channels === 4 ? raw[source + 3]! : 255;
  }
  const classification = classifyAlpha(rgba);
  if (classification !== declaration.alphaClassification) {
    throw new Error(
      "External PNG alpha classification does not match the manifest.",
    );
  }
  return Object.freeze({
    width: header.width,
    height: header.height,
    data: rgba,
  });
}

interface PngHeader {
  readonly width: number;
  readonly height: number;
  readonly colorType: 2 | 6;
}

function parseHeader(data: Buffer): PngHeader {
  const width = data.readUInt32BE(0);
  const height = data.readUInt32BE(4);
  const bitDepth = data[8];
  const colorType = data[9];
  if (
    width === 0 ||
    height === 0 ||
    bitDepth !== 8 ||
    (colorType !== 2 && colorType !== 6) ||
    data[10] !== 0 ||
    data[11] !== 0 ||
    data[12] !== 0
  ) {
    throw new Error(
      "External PNG must be non-interlaced 8-bit RGB or RGBA with standard compression and filtering.",
    );
  }
  return { width, height, colorType };
}

function unfilter(
  bytes: Buffer,
  width: number,
  height: number,
  bytesPerPixel: number,
): Uint8Array {
  const rowBytes = width * bytesPerPixel;
  const result = new Uint8Array(rowBytes * height);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = bytes[sourceOffset++]!;
    if (filter > 4) throw new Error("PNG scanline filter is invalid.");
    const rowOffset = row * rowBytes;
    for (let column = 0; column < rowBytes; column += 1) {
      const encoded = bytes[sourceOffset++]!;
      const left =
        column >= bytesPerPixel
          ? result[rowOffset + column - bytesPerPixel]!
          : 0;
      const above = row > 0 ? result[rowOffset - rowBytes + column]! : 0;
      const upperLeft =
        row > 0 && column >= bytesPerPixel
          ? result[rowOffset - rowBytes + column - bytesPerPixel]!
          : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? above
              : filter === 3
                ? Math.floor((left + above) / 2)
                : paeth(left, above, upperLeft);
      result[rowOffset + column] = (encoded + predictor) & 0xff;
    }
  }
  return result;
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance)
    return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function classifyAlpha(
  data: Uint8ClampedArray,
): GeneratorQualityInputDeclaration["alphaClassification"] {
  let hasTransparent = false;
  let hasPartial = false;
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index]!;
    if (alpha === 0) hasTransparent = true;
    else if (alpha !== 255) hasPartial = true;
  }
  if (hasPartial) return "partial-alpha";
  return hasTransparent ? "binary-alpha" : "opaque";
}

function verifyChunkCrc(typeAndData: Buffer, expected: number): void {
  let crc = 0xffffffff;
  for (const byte of typeAndData) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  if ((crc ^ 0xffffffff) >>> 0 !== expected) {
    throw new Error("PNG chunk CRC is invalid.");
  }
}
