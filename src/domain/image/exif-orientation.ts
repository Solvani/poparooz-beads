import type { ExifOrientation, ExifOrientationResult } from "./image.types";

const EXIF_MARKER = 0xe1;
const ORIENTATION_TAG = 0x0112;
const TIFF_SHORT = 3;

export function readExifOrientation(bytes: Uint8Array): ExifOrientationResult {
  if (!isJpeg(bytes)) return { orientation: 1, status: "missing" };

  let offset = 2;
  while (offset < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset]!;
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (!rangeFits(bytes.length, offset, 2)) {
      return { orientation: 1, status: "invalid" };
    }

    const segmentLength = readUint16(bytes, offset, false);
    if (segmentLength < 2 || !rangeFits(bytes.length, offset, segmentLength)) {
      return { orientation: 1, status: "invalid" };
    }

    const payloadOffset = offset + 2;
    const payloadLength = segmentLength - 2;
    if (
      marker === EXIF_MARKER &&
      payloadLength >= 6 &&
      hasExifHeader(bytes, payloadOffset)
    ) {
      return parseTiffOrientation(bytes, payloadOffset + 6, payloadLength - 6);
    }
    offset += segmentLength;
  }

  return { orientation: 1, status: "missing" };
}

function parseTiffOrientation(
  bytes: Uint8Array,
  tiffOffset: number,
  tiffLength: number,
): ExifOrientationResult {
  if (tiffLength < 8 || !rangeFits(bytes.length, tiffOffset, tiffLength)) {
    return { orientation: 1, status: "invalid" };
  }

  const first = bytes[tiffOffset];
  const second = bytes[tiffOffset + 1];
  const littleEndian = first === 0x49 && second === 0x49;
  const bigEndian = first === 0x4d && second === 0x4d;
  if (!littleEndian && !bigEndian) {
    return { orientation: 1, status: "invalid" };
  }

  if (readUint16(bytes, tiffOffset + 2, littleEndian) !== 42) {
    return { orientation: 1, status: "invalid" };
  }

  const ifdRelativeOffset = readUint32(bytes, tiffOffset + 4, littleEndian);
  if (ifdRelativeOffset > tiffLength - 2) {
    return { orientation: 1, status: "invalid" };
  }
  const ifdOffset = tiffOffset + ifdRelativeOffset;
  if (!rangeFits(tiffOffset + tiffLength, ifdOffset, 2)) {
    return { orientation: 1, status: "invalid" };
  }

  const entryCount = readUint16(bytes, ifdOffset, littleEndian);
  const entriesOffset = ifdOffset + 2;
  if (entryCount > Math.floor((tiffOffset + tiffLength - entriesOffset) / 12)) {
    return { orientation: 1, status: "invalid" };
  }

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesOffset + index * 12;
    const tag = readUint16(bytes, entryOffset, littleEndian);
    if (tag !== ORIENTATION_TAG) continue;

    const type = readUint16(bytes, entryOffset + 2, littleEndian);
    const count = readUint32(bytes, entryOffset + 4, littleEndian);
    if (type !== TIFF_SHORT || count !== 1) {
      return { orientation: 1, status: "invalid" };
    }

    const value = readUint16(bytes, entryOffset + 8, littleEndian);
    if (value < 1 || value > 8) {
      return { orientation: 1, status: "invalid" };
    }
    return { orientation: value as ExifOrientation, status: "present" };
  }

  return { orientation: 1, status: "missing" };
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

function hasExifHeader(bytes: Uint8Array, offset: number): boolean {
  return (
    bytes[offset] === 0x45 &&
    bytes[offset + 1] === 0x78 &&
    bytes[offset + 2] === 0x69 &&
    bytes[offset + 3] === 0x66 &&
    bytes[offset + 4] === 0x00 &&
    bytes[offset + 5] === 0x00
  );
}

function readUint16(
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean,
): number {
  return littleEndian
    ? bytes[offset]! | (bytes[offset + 1]! << 8)
    : (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUint32(
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean,
): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset, littleEndian);
}

function rangeFits(limit: number, offset: number, length: number): boolean {
  return (
    Number.isSafeInteger(offset) &&
    Number.isSafeInteger(length) &&
    offset >= 0 &&
    length >= 0 &&
    offset <= limit - length
  );
}
