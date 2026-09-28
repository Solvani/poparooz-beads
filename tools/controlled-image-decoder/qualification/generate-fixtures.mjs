import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { deflateSync, inflateSync } from "node:zlib";

import sharp from "sharp";

const root = new URL("./", import.meta.url);
const fixtureDirectory = new URL("./static/fixtures/", root);
await rm(fixtureDirectory, { recursive: true, force: true });
await mkdir(fixtureDirectory, { recursive: true });

const width = 3;
const height = 2;
const rgb = Buffer.from([
  16, 32, 48, 64, 96, 128, 192, 160, 128, 240, 224, 208, 128, 64, 32, 8, 24, 40,
]);
const rgba = Buffer.from([
  16, 32, 48, 0, 64, 96, 128, 1, 192, 160, 128, 127, 240, 224, 208, 128, 128,
  64, 32, 254, 8, 24, 40, 255,
]);
const gray = Buffer.from([16, 64, 128, 192, 224, 240]);
const grayAlpha = Buffer.from([
  16, 0, 64, 1, 128, 127, 192, 128, 224, 254, 240, 255,
]);
const fixtures = [];
const rgbImage = () => sharp(rgb, { raw: { width, height, channels: 3 } });
const rgbaImage = () => sharp(rgba, { raw: { width, height, channels: 4 } });

async function add(
  fixtureId,
  actualCodec,
  expectedDisposition,
  bytes,
  notes,
  options = {},
) {
  const extension =
    actualCodec === "JPEG" ? "jpg" : actualCodec === "PNG" ? "png" : "webp";
  const filename = `${fixtureId}.${extension}`;
  await writeFile(new URL(filename, fixtureDirectory), bytes);
  let independentPixelSha256 = null;
  if (expectedDisposition === "PASS") {
    const independent = await sharp(bytes)
      .autoOrient()
      .toColourspace("srgb")
      .ensureAlpha()
      .raw()
      .toBuffer();
    independentPixelSha256 = sha256(independent);
  }
  fixtures.push({
    fixtureId,
    sourceFilename: `fixtures/${filename}`,
    sourceSha256: sha256(bytes),
    sourceByteLength: bytes.length,
    actualCodec,
    expectedDisposition,
    notes,
    independentPixelSha256,
    ...options,
  });
}

const jpegBaseline = await rgbImage()
  .jpeg({ quality: 100, chromaSubsampling: "4:4:4", progressive: false })
  .toBuffer();
const jpegProgressive = await rgbImage()
  .jpeg({ quality: 100, chromaSubsampling: "4:4:4", progressive: true })
  .toBuffer();
const jpegGrayscale = await sharp(gray, { raw: { width, height, channels: 1 } })
  .jpeg({ quality: 100 })
  .toBuffer();
await add(
  "jpeg-rgb-baseline",
  "JPEG",
  "PASS",
  jpegBaseline,
  "Sharp baseline RGB JPEG",
);
await add(
  "jpeg-progressive",
  "JPEG",
  "PASS",
  jpegProgressive,
  "Sharp progressive RGB JPEG",
);
await add(
  "jpeg-grayscale",
  "JPEG",
  "PASS",
  jpegGrayscale,
  "Sharp one-component grayscale JPEG",
);
for (let orientation = 1; orientation <= 8; orientation += 1) {
  await add(
    `jpeg-exif-orientation-${orientation}`,
    "JPEG",
    "PASS",
    insertJpegSegment(jpegBaseline, 0xe1, exifPayload(orientation)),
    `Minimal TIFF EXIF orientation ${orientation}`,
  );
}
const jpegSrgbIcc = await rgbImage()
  .withIccProfile("srgb")
  .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
  .toBuffer();
const jpegP3Icc = await rgbImage()
  .withIccProfile("p3")
  .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
  .toBuffer();
await add(
  "jpeg-icc-srgb",
  "JPEG",
  "PASS",
  jpegSrgbIcc,
  "Sharp built-in sRGB ICC",
);
await add(
  "jpeg-icc-display-p3",
  "JPEG",
  "PASS",
  jpegP3Icc,
  "Sharp built-in Display P3 ICC",
);
await add(
  "jpeg-truncated",
  "JPEG",
  "DECODE_FAILED",
  jpegBaseline.subarray(0, Math.floor(jpegBaseline.length / 2)),
  "Truncated baseline JPEG",
);
await add(
  "jpeg-malformed",
  "JPEG",
  "DECODE_FAILED",
  Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 7, 8, 0, 2, 0, 3]),
  "Malformed SOF length",
);
await add(
  "jpeg-width-limit",
  "JPEG",
  "ENCODED_DIMENSION_LIMIT_EXCEEDED",
  mutateJpegDimensions(jpegBaseline, 8193, 1),
  "SOF width exceeds 8192",
);
const jpegCmyk = await rgbImage()
  .toColourspace("cmyk")
  .jpeg({ quality: 95 })
  .toBuffer();
await add(
  "jpeg-cmyk",
  "JPEG",
  "UNSUPPORTED_CODEC_FEATURE",
  jpegCmyk,
  "Sharp four-component CMYK JPEG",
);
await add(
  "jpeg-ycck-style",
  "JPEG",
  "UNSUPPORTED_CODEC_FEATURE",
  insertJpegSegment(jpegCmyk, 0xee, adobePayload(2)),
  "Four-component JPEG with Adobe APP14 transform 2",
);

const pngRgbBase = stripPngColorChunks(await rgbImage().png().toBuffer());
const pngRgbaBase = stripPngColorChunks(await rgbaImage().png().toBuffer());
const pngRgb = insertPngChunks(pngRgbBase, [
  pngChunk("sRGB", Buffer.from([1])),
]);
const pngRgba = insertPngChunks(pngRgbaBase, [
  pngChunk("sRGB", Buffer.from([1])),
]);
await add("png-rgb", "PNG", "PASS", pngRgb, "RGB PNG with explicit sRGB");
await add("png-rgba", "PNG", "PASS", pngRgba, "RGBA PNG with explicit sRGB");
const pngGrayBase = stripPngColorChunks(
  await sharp(gray, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer(),
);
const pngGrayAlphaBase = stripPngColorChunks(
  await sharp(grayAlpha, { raw: { width, height, channels: 2 } })
    .png()
    .toBuffer(),
);
await add(
  "png-grayscale",
  "PNG",
  "PASS",
  insertPngChunks(pngGrayBase, [pngChunk("sRGB", Buffer.from([1]))]),
  "Grayscale PNG with explicit sRGB",
);
await add(
  "png-grayscale-alpha",
  "PNG",
  "PASS",
  insertPngChunks(pngGrayAlphaBase, [pngChunk("sRGB", Buffer.from([1]))]),
  "Grayscale-alpha PNG with explicit sRGB",
);
const pngPaletteBase = stripPngColorChunks(
  await rgbaImage().png({ palette: true, colours: 16 }).toBuffer(),
);
await add(
  "png-palette",
  "PNG",
  "PASS",
  insertPngChunks(pngPaletteBase, [pngChunk("sRGB", Buffer.from([1]))]),
  "Palette PNG",
);
const pngAdam7Base = stripPngColorChunks(
  await rgbaImage().png({ progressive: true }).toBuffer(),
);
await add(
  "png-adam7",
  "PNG",
  "PASS",
  insertPngChunks(pngAdam7Base, [pngChunk("sRGB", Buffer.from([1]))]),
  "Adam7 interlaced PNG",
);
await add(
  "png-partial-alpha",
  "PNG",
  "PASS",
  pngRgba,
  "Alpha sentinels 0,1,127,128,254,255",
);
await add(
  "png-srgb-chunk",
  "PNG",
  "PASS",
  insertPngChunks(pngRgbBase, [pngChunk("sRGB", Buffer.from([0]))]),
  "PNG sRGB chunk",
);
const pngIcc = await rgbaImage().withIccProfile("srgb").png().toBuffer();
await add("png-icc-srgb", "PNG", "PASS", pngIcc, "Sharp built-in sRGB ICC");
const gamma = u32be(45_455);
const chromaticity = Buffer.concat(
  [31_270, 32_900, 64_000, 33_000, 30_000, 60_000, 15_000, 6_000].map(u32be),
);
await add(
  "png-standard-gama-chrm",
  "PNG",
  "PASS",
  insertPngChunks(pngRgbBase, [
    pngChunk("gAMA", gamma),
    pngChunk("cHRM", chromaticity),
  ]),
  "Exact standard sRGB-equivalent gAMA/cHRM",
);
await add(
  "png-conflicting-color-metadata",
  "PNG",
  "UNSUPPORTED_COLOR_PROFILE",
  insertPngChunks(pngIcc, [pngChunk("sRGB", Buffer.from([1]))]),
  "Conflicting iCCP and sRGB",
);
await add(
  "png-nonstandard-gama-chrm",
  "PNG",
  "UNSUPPORTED_COLOR_PROFILE",
  insertPngChunks(pngRgbBase, [
    pngChunk("gAMA", u32be(50_000)),
    pngChunk("cHRM", chromaticity),
  ]),
  "Nonstandard gAMA",
);
await add(
  "png-16-bit",
  "PNG",
  "UNSUPPORTED_CODEC_FEATURE",
  createPng(1, 1, 16, 6, Buffer.from([0, 0xff, 0xff, 0, 0, 0, 0, 0xff, 0xff])),
  "Hand-authored 16-bit RGBA PNG",
);
await add(
  "png-apng",
  "PNG",
  "UNSUPPORTED_CODEC_FEATURE",
  insertPngChunks(pngRgbaBase, [
    pngChunk("acTL", Buffer.concat([u32be(1), u32be(0)])),
    pngChunk("sRGB", Buffer.from([1])),
  ]),
  "APNG control chunk",
);
await add(
  "png-malformed",
  "PNG",
  "DECODE_FAILED",
  corruptPngIdatLength(pngRgb),
  "Valid sRGB declaration followed by invalid IDAT length",
);
await add(
  "png-truncated",
  "PNG",
  "DECODE_FAILED",
  truncatePngAfterColorDeclaration(pngRgb),
  "Truncated after explicit sRGB declaration",
);
await add(
  "png-width-limit",
  "PNG",
  "ENCODED_DIMENSION_LIMIT_EXCEEDED",
  mutatePngDimensions(pngRgb, 8193, 1),
  "IHDR width exceeds 8192",
);
await add(
  "png-height-limit",
  "PNG",
  "ENCODED_DIMENSION_LIMIT_EXCEEDED",
  mutatePngDimensions(pngRgb, 1, 8193),
  "IHDR height exceeds 8192",
);
await add(
  "png-pixel-limit",
  "PNG",
  "PIXEL_LIMIT_EXCEEDED",
  mutatePngDimensions(pngRgb, 7000, 6000),
  "IHDR pixel count exceeds 40M",
);
await add(
  "png-invalid-icc",
  "PNG",
  "INVALID_ICC_PROFILE",
  insertPngChunks(pngRgbBase, [
    pngChunk(
      "iCCP",
      Buffer.concat([Buffer.from("bad\0", "ascii"), Buffer.from([0, 1, 2, 3])]),
    ),
  ]),
  "Declared iCCP with invalid compressed payload",
);
await add(
  "png-parse-invalid-icc",
  "PNG",
  "INVALID_ICC_PROFILE",
  insertPngChunks(pngRgbBase, [
    pngChunk(
      "iCCP",
      Buffer.concat([
        Buffer.from("bad-profile\0", "ascii"),
        Buffer.from([0]),
        deflateSync(Buffer.alloc(128)),
      ]),
    ),
  ]),
  "Decompressible but invalid ICC profile",
);
await add(
  "png-unsupported-icc-class",
  "PNG",
  "UNSUPPORTED_COLOR_PROFILE",
  replacePngIccProfileClass(pngIcc, "link"),
  "Parseable device-link profile class unsupported for RGBA transform",
);
await add(
  "png-duplicate-icc",
  "PNG",
  "UNSUPPORTED_COLOR_PROFILE",
  duplicatePngIcc(pngIcc),
  "Duplicate iCCP declaration",
);
await add(
  "png-icc-limit",
  "PNG",
  "METADATA_LIMIT_EXCEEDED",
  insertPngChunks(pngRgbBase, [
    pngChunk(
      "iCCP",
      Buffer.concat([
        Buffer.from("large\0", "ascii"),
        Buffer.from([0]),
        deflateSync(Buffer.alloc(1024 * 1024 + 1)),
      ]),
    ),
  ]),
  "Decompressed ICC exceeds 1 MiB",
);
await add(
  "png-exif-limit",
  "PNG",
  "METADATA_LIMIT_EXCEEDED",
  insertPngChunks(pngRgbBase, [
    pngChunk("eXIf", Buffer.alloc(256 * 1024 + 1)),
    pngChunk("sRGB", Buffer.from([1])),
  ]),
  "EXIF exceeds 256 KiB",
);
await add(
  "png-ancillary-limit",
  "PNG",
  "METADATA_LIMIT_EXCEEDED",
  insertPngChunks(pngRgbBase, [
    pngChunk("tEXt", Buffer.alloc(2 * 1024 * 1024 + 1)),
    pngChunk("sRGB", Buffer.from([1])),
  ]),
  "Ancillary metadata exceeds 2 MiB",
);

const webpLossy = await rgbImage().webp({ quality: 90 }).toBuffer();
const webpLossless = await rgbImage().webp({ lossless: true }).toBuffer();
const webpAlpha = await rgbaImage().webp({ lossless: true }).toBuffer();
const webpIcc = await rgbImage()
  .withIccProfile("srgb")
  .webp({ lossless: true })
  .toBuffer();
const webpExif = await rgbImage()
  .withMetadata({ orientation: 6 })
  .webp({ lossless: true })
  .toBuffer();
await add("webp-lossy", "WEBP", "PASS", webpLossy, "Sharp lossy WebP");
await add("webp-lossless", "WEBP", "PASS", webpLossless, "Sharp lossless WebP");
await add(
  "webp-alpha",
  "WEBP",
  "PASS",
  webpAlpha,
  "Sharp lossless WebP alpha; transparent RGB authority follows encoded bytes",
);
await add("webp-icc-srgb", "WEBP", "PASS", webpIcc, "Sharp built-in sRGB ICC");
await add(
  "webp-exif-orientation-6",
  "WEBP",
  "PASS",
  webpExif,
  "Sharp EXIF orientation 6",
);
await add(
  "webp-animated",
  "WEBP",
  "UNSUPPORTED_CODEC_FEATURE",
  appendWebpChunk(webpLossless, "ANIM", Buffer.alloc(6)),
  "Synthetic animated-control chunk",
);
await add(
  "webp-malformed",
  "WEBP",
  "DECODE_FAILED",
  Buffer.from("RIFF\x04\x00\x00\x00WEBP", "binary"),
  "Malformed WebP",
);
await add(
  "webp-truncated",
  "WEBP",
  "DECODE_FAILED",
  webpLossless.subarray(0, Math.floor(webpLossless.length / 2)),
  "Truncated WebP",
);
await add(
  "webp-metadata-limit",
  "WEBP",
  "METADATA_LIMIT_EXCEEDED",
  appendWebpChunk(webpLossless, "XMP ", Buffer.alloc(2 * 1024 * 1024 + 1)),
  "WebP metadata exceeds 2 MiB",
);

const sourceLimit = Buffer.alloc(20 * 1024 * 1024 + 1);
pngRgb.copy(sourceLimit);
await add(
  "runtime-source-byte-limit",
  "PNG",
  "SOURCE_TOO_LARGE",
  sourceLimit,
  "20 MiB plus one byte",
);

const lock = JSON.parse(
  await readFile(new URL("./package-lock.json", root), "utf8"),
);
const sharpLock = lock.packages["node_modules/sharp"];
const provenance = {
  schema: "PoparoozControlledDecoderFixtureProvenance/1.0.0",
  generator: {
    project: "sharp",
    version: sharp.versions.sharp,
    libvipsVersion: sharp.versions.vips,
    license: sharpLock.license,
    packageIntegrity: sharpLock.integrity,
    method: "corepack npm@11.9.0 ci && node generate-fixtures.mjs",
  },
  rejectedGenerator: {
    project: "sharp",
    version: "0.34.4",
    reason: "Rejected after high-severity npm advisory findings",
  },
  sourceDescription:
    "Synthetic public 3x2 pixels plus deterministic malformed, metadata and security-limit variants",
  fixtureCount: fixtures.length,
  fixtures,
};
await writeFile(
  new URL("./static/fixture-provenance.json", root),
  `${JSON.stringify(provenance, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      fixtureCount: fixtures.length,
      sharp: sharp.versions.sharp,
      libvips: sharp.versions.vips,
    },
    null,
    2,
  ),
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function exifPayload(orientation) {
  const tiff = Buffer.alloc(26);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x0112, 10);
  tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  tiff.writeUInt32LE(0, 22);
  return Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
}
function adobePayload(transform) {
  const payload = Buffer.alloc(12);
  payload.write("Adobe", 0, "ascii");
  payload.writeUInt16BE(100, 5);
  payload[11] = transform;
  return payload;
}
function insertJpegSegment(bytes, marker, payload) {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([
    bytes.subarray(0, 2),
    Buffer.from([0xff, marker]),
    length,
    payload,
    bytes.subarray(2),
  ]);
}
function mutateJpegDimensions(bytes, newWidth, newHeight) {
  const output = Buffer.from(bytes);
  for (let offset = 2; offset + 9 < output.length;) {
    if (output[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = output[offset + 1];
    const length = output.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      output.writeUInt16BE(newHeight, offset + 5);
      output.writeUInt16BE(newWidth, offset + 7);
      return output;
    }
    offset += 2 + length;
  }
  throw new Error("JPEG SOF not found");
}
function createPng(pngWidth, pngHeight, bitDepth, colorType, scanline) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(pngWidth, 0);
  ihdr.writeUInt32BE(pngHeight, 4);
  ihdr.set([bitDepth, colorType, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("sRGB", Buffer.from([1])),
    pngChunk("IDAT", deflateSync(scanline)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
function mutatePngDimensions(bytes, newWidth, newHeight) {
  const output = Buffer.from(bytes);
  output.writeUInt32BE(newWidth, 16);
  output.writeUInt32BE(newHeight, 20);
  output.writeUInt32BE(crc32(output.subarray(12, 29)), 29);
  return output;
}
function corruptPngIdatLength(bytes) {
  const output = Buffer.from(bytes);
  const chunks = readPngChunksWithOffsets(output);
  const idat = chunks.find(({ type }) => type === "IDAT");
  output.writeUInt32BE(0x7fffffff, idat.offset);
  return output;
}
function truncatePngAfterColorDeclaration(bytes) {
  const chunks = readPngChunksWithOffsets(bytes);
  const idat = chunks.find(({ type }) => type === "IDAT");
  return bytes.subarray(0, idat.offset + 9);
}
function stripPngColorChunks(bytes) {
  return Buffer.concat([
    bytes.subarray(0, 8),
    ...readPngChunks(bytes)
      .filter(({ type }) => !["sRGB", "iCCP", "gAMA", "cHRM"].includes(type))
      .map(({ type, data }) => pngChunk(type, data)),
  ]);
}
function insertPngChunks(bytes, additions) {
  const chunks = readPngChunks(bytes);
  return Buffer.concat([
    bytes.subarray(0, 8),
    pngChunk(chunks[0].type, chunks[0].data),
    ...additions,
    ...chunks.slice(1).map(({ type, data }) => pngChunk(type, data)),
  ]);
}
function duplicatePngIcc(bytes) {
  const chunks = readPngChunks(bytes);
  const iccp = chunks.find(({ type }) => type === "iCCP");
  return insertPngChunks(bytes, [pngChunk("iCCP", iccp.data)]);
}
function replacePngIccProfileClass(bytes, profileClass) {
  const chunks = readPngChunks(bytes);
  const iccp = chunks.find(({ type }) => type === "iCCP");
  const zero = iccp.data.indexOf(0);
  const profile = inflateSync(iccp.data.subarray(zero + 2));
  profile.write(profileClass, 12, 4, "ascii");
  const replacement = Buffer.concat([
    iccp.data.subarray(0, zero + 2),
    deflateSync(profile),
  ]);
  return Buffer.concat([
    bytes.subarray(0, 8),
    ...chunks.map(({ type, data }) =>
      pngChunk(type, type === "iCCP" ? replacement : data),
    ),
  ]);
}
function readPngChunks(bytes) {
  return readPngChunksWithOffsets(bytes).map(({ type, data }) => ({
    type,
    data,
  }));
}
function readPngChunksWithOffsets(bytes) {
  const chunks = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    chunks.push({
      type,
      data: bytes.subarray(offset + 8, offset + 8 + length),
      offset,
    });
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return chunks;
}
function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  return Buffer.concat([
    u32be(data.length),
    name,
    data,
    u32be(crc32(Buffer.concat([name, data]))),
  ]);
}
function appendWebpChunk(bytes, type, data) {
  const padding = data.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  const header = Buffer.alloc(8);
  header.write(type, 0, "ascii");
  header.writeUInt32LE(data.length, 4);
  const output = Buffer.concat([bytes, header, data, padding]);
  output.writeUInt32LE(output.length - 8, 4);
  return output;
}
function u32be(value) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);
  return bytes;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
