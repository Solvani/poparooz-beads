import type { ExifOrientation, RgbaImage } from "./image.types";

export const MINIMAL_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

export const MINIMAL_WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

export const MINIMAL_JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xd9,
]);

export function createExifJpeg(
  orientation: ExifOrientation,
  littleEndian = true,
): Uint8Array {
  const tiffLength = 8 + 2 + 12 + 4;
  const payloadLength = 6 + tiffLength;
  const segmentLength = payloadLength + 2;
  const bytes = new Uint8Array(2 + 2 + segmentLength + 2);
  const view = new DataView(bytes.buffer);
  bytes.set([0xff, 0xd8, 0xff, 0xe1], 0);
  view.setUint16(4, segmentLength, false);
  bytes.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 6);
  const tiff = 12;
  bytes.set(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d], tiff);
  view.setUint16(tiff + 2, 42, littleEndian);
  view.setUint32(tiff + 4, 8, littleEndian);
  const ifd = tiff + 8;
  view.setUint16(ifd, 1, littleEndian);
  const entry = ifd + 2;
  view.setUint16(entry, 0x0112, littleEndian);
  view.setUint16(entry + 2, 3, littleEndian);
  view.setUint32(entry + 4, 1, littleEndian);
  view.setUint16(entry + 8, orientation, littleEndian);
  view.setUint32(entry + 12, 0, littleEndian);
  bytes.set([0xff, 0xd9], bytes.length - 2);
  return bytes;
}

export function rgbaFromIds(width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = index + 1;
    data[index * 4 + 3] = 255;
  }
  return { width, height, data };
}

export function redChannelRows(image: RgbaImage): number[][] {
  return Array.from({ length: image.height }, (_, y) =>
    Array.from(
      { length: image.width },
      (_, x) => image.data[(y * image.width + x) * 4]!,
    ),
  );
}
