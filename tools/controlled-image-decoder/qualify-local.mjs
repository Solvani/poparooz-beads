import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { deflateSync } from "node:zlib";

import init, {
  decode_controlled,
} from "../../src/operator/controlled-generation/decoder/artifacts/1.0.0/poparooz-controlled-image-decoder-1_0_0.js";

const artifactUrl = new URL(
  "../../src/operator/controlled-generation/decoder/artifacts/1.0.0/poparooz-controlled-image-decoder-1_0_0_bg.wasm",
  import.meta.url,
);
const wasmBytes = await readFile(artifactUrl);
const wasmModule = await WebAssembly.compile(wasmBytes);
const initializationStarted = performance.now();
const runtime = await init({ module_or_path: wasmBytes });
const coldInitializationMilliseconds =
  performance.now() - initializationStarted;

const rgba = Uint8Array.from([
  10, 20, 30, 0, 11, 21, 31, 1, 12, 22, 32, 127, 13, 23, 33, 128, 14, 24, 34,
  254, 15, 25, 35, 255,
]);
const sourceBytes = createSrgbPng(6, 1, rgba);
const decodeDurations = [];
let decoded;
for (let index = 0; index < 25; index += 1) {
  const started = performance.now();
  decoded = decode_controlled(
    sourceBytes,
    "PNG",
    20 * 1024 * 1024,
    8192,
    8192,
    40_000_000,
    160_000_000,
    1024 * 1024,
    256 * 1024,
    2 * 1024 * 1024,
    1,
    "EXPLICIT_SRGB_V1",
    "APPLY_1_TO_8_THEN_ORIENTATION_1",
  );
  decodeDurations.push(performance.now() - started);
  if (index < 24) decoded.free();
}

const output = decoded.rgba_bytes();
const outputDigest = createHash("sha256").update(output).digest("hex");
if (!output.every((value, index) => value === rgba[index])) {
  throw new Error("RGBA authority mismatch");
}
if (decoded.decoded_pixel_sha256 !== `sha256:${outputDigest}`) {
  throw new Error("decoded pixel digest mismatch");
}
decodeDurations.sort((left, right) => left - right);

console.log(
  JSON.stringify(
    {
      schema: "PoparoozControlledDecoderLocalQualification/1.0.0",
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      wasmSha256: createHash("sha256").update(wasmBytes).digest("hex"),
      sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
      decodedPixelSha256: outputDigest,
      exactRgbaBytes: [...output],
      encodedDimensions: [decoded.encoded_width, decoded.encoded_height],
      decodedDimensions: [decoded.decoded_width, decoded.decoded_height],
      orientationObserved: decoded.orientation_observed,
      iccState: decoded.icc_state,
      coldInitializationMilliseconds,
      medianPngDecodeMilliseconds: decodeDurations[12],
      wasmMemoryBytesAfterDecode: runtime.memory.buffer.byteLength,
      sharedMemory: runtime.memory.buffer instanceof SharedArrayBuffer,
      wasmImports: WebAssembly.Module.imports(wasmModule),
    },
    null,
    2,
  ),
);
decoded.free();

function createSrgbPng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const scanline = Buffer.concat([Buffer.from([0]), Buffer.from(pixels)]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("sRGB", Buffer.from([1])),
    chunk("IDAT", deflateSync(scanline, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
