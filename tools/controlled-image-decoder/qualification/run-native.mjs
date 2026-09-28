import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

import init, {
  decode_controlled,
} from "../../../src/operator/controlled-generation/decoder/artifacts/1.0.0/poparooz-controlled-image-decoder-1_0_0.js";

const here = dirname(fileURLToPath(import.meta.url));
const artifactDir = resolve(
  here,
  "../../../src/operator/controlled-generation/decoder/artifacts/1.0.0",
);
const wasmPath = resolve(
  artifactDir,
  "poparooz-controlled-image-decoder-1_0_0_bg.wasm",
);
const manifest = JSON.parse(
  await readFile(resolve(artifactDir, "artifact-manifest.json"), "utf8"),
);
const provenance = JSON.parse(
  await readFile(resolve(here, "static/fixture-provenance.json"), "utf8"),
);
const wasmBytes = await readFile(wasmPath);
const wasmSha256 = sha256(wasmBytes);

assertEqual(
  wasmSha256,
  "dd932592ad60b70ca0766bf9e402861e751c25194fb3386c0389dd6ecca6eeed",
  "remediated WASM digest",
);
assertEqual(
  wasmSha256,
  manifest.decoderArtifactSha256,
  "artifact manifest digest",
);
assertEqual(
  manifest.cargoLockSha256,
  "bdaf0fc8c3e1c2c3b397adaa46c5c5ee268973cb5ffd62073ef13d319c5757da",
  "Cargo.lock digest",
);

const module = await WebAssembly.compile(wasmBytes);
const imports = WebAssembly.Module.imports(module);
if (imports.some((entry) => entry.kind === "memory")) {
  throw new Error("WASM imports shared or host memory");
}
await init({ module_or_path: module });

const limits = {
  maximumSourceBytes: 20 * 1024 * 1024,
  maximumEncodedWidth: 8192,
  maximumEncodedHeight: 8192,
  maximumPixelCount: 40_000_000,
  maximumDecodedRgbaBytes: 160_000_000,
  maximumIccProfileBytes: 1024 * 1024,
  maximumExifBytes: 256 * 1024,
  maximumTotalAncillaryBytes: 2 * 1024 * 1024,
  maximumFrames: 1,
};

const cases = [];
let failures = 0;
for (const fixture of provenance.fixtures) {
  const source = await readFile(
    resolve(here, "static", fixture.sourceFilename),
  );
  assertEqual(
    sha256(source),
    fixture.sourceSha256,
    `${fixture.fixtureId} source digest`,
  );
  let actual;
  try {
    const decoded = decode(source, fixture.actualCodec);
    actual = {
      disposition: "PASS",
      encodedWidth: decoded.encoded_width,
      encodedHeight: decoded.encoded_height,
      decodedWidth: decoded.decoded_width,
      decodedHeight: decoded.decoded_height,
      orientationObserved: decoded.orientation_observed,
      orientationState: decoded.orientation_state,
      iccState: decoded.icc_state,
      pixelFormat: decoded.pixel_format,
      decodedPixelSha256: stripShaPrefix(decoded.decoded_pixel_sha256),
      rgbaByteLength: decoded.rgba_bytes().byteLength,
      actualCodec: decoded.actual_codec,
      decoderImplementationId: decoded.decoder_implementation_id,
      decoderImplementationVersion: decoded.decoder_implementation_version,
      runtimeAbiVersion: decoded.runtime_abi_version,
    };
    decoded.free();
  } catch (reason) {
    actual = { disposition: errorCode(reason) };
  }
  const passed = actual.disposition === fixture.expectedDisposition;
  if (!passed) failures += 1;
  cases.push({
    fixtureId: fixture.fixtureId,
    sourceSha256: fixture.sourceSha256,
    expectedDisposition: fixture.expectedDisposition,
    independentPixelSha256: fixture.independentPixelSha256,
    independentPixelMatch:
      actual.disposition === "PASS" && fixture.independentPixelSha256 !== null
        ? actual.decodedPixelSha256 === fixture.independentPixelSha256
        : null,
    actual,
    passed,
  });
}

const negativeContractCases = [
  runNegative(
    "codec-declaration-mismatch",
    "CODEC_DECLARATION_MISMATCH",
    () => {
      const fixture = provenance.fixtures.find(
        (entry) => entry.fixtureId === "png-rgb",
      );
      return readFile(resolve(here, "static", fixture.sourceFilename)).then(
        (source) => decode(source, "JPEG"),
      );
    },
  ),
  runNegative(
    "runtime-color-authority-mismatch",
    "RUNTIME_AUTHORITY_MISMATCH",
    async () => {
      const fixture = provenance.fixtures.find(
        (entry) => entry.fixtureId === "png-rgb",
      );
      const source = await readFile(
        resolve(here, "static", fixture.sourceFilename),
      );
      return decode(source, "PNG", "WRONG_COLOR_POLICY");
    },
  ),
];
for (const result of await Promise.all(negativeContractCases)) {
  cases.push(result);
  if (!result.passed) failures += 1;
}

const result = {
  schema: "PoparoozControlledDecoderQualificationResult/1.0.0",
  runner: "node-native-wasm",
  environmentId:
    process.env.QUALIFICATION_ENVIRONMENT_ID ?? `${process.platform}-native`,
  platform: `${process.platform}-${process.arch}`,
  osRelease: os.release(),
  nodeVersion: process.version,
  wasmSha256,
  cargoLockSha256: manifest.cargoLockSha256,
  fixtureCount: provenance.fixtureCount,
  importedMemoryCount: imports.filter((entry) => entry.kind === "memory")
    .length,
  failures,
  cases,
};

const outputPath = resolve(
  process.env.QUALIFICATION_RESULT ??
    resolve(here, "results/native-local.json"),
);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);

if (process.argv.includes("--write-manifest")) {
  const golden = {
    schema: "PoparoozControlledDecoderGoldenManifest/1.0.0",
    wasmSha256,
    cargoLockSha256: manifest.cargoLockSha256,
    fixtureCount: provenance.fixtureCount,
    cases: cases
      .filter((entry) =>
        provenance.fixtures.some(
          (fixture) => fixture.fixtureId === entry.fixtureId,
        ),
      )
      .map(({ fixtureId, sourceSha256, expectedDisposition, actual }) => {
        const fixture = provenance.fixtures.find(
          (entry) => entry.fixtureId === fixtureId,
        );
        return {
          fixtureId,
          sourceFilename: fixture.sourceFilename,
          sourceSha256,
          actualCodec: fixture.actualCodec,
          expectedDisposition,
          expected: actual,
        };
      }),
  };
  await writeFile(
    resolve(here, "static/golden-manifest.json"),
    `${JSON.stringify(golden, null, 2)}\n`,
  );
}

console.log(
  JSON.stringify(
    { outputPath, fixtureCount: provenance.fixtureCount, failures },
    null,
    2,
  ),
);
if (failures !== 0) process.exitCode = 1;

function decode(source, codec, colorPolicy = "EXPLICIT_SRGB_V1") {
  return decode_controlled(
    source,
    codec,
    limits.maximumSourceBytes,
    limits.maximumEncodedWidth,
    limits.maximumEncodedHeight,
    limits.maximumPixelCount,
    limits.maximumDecodedRgbaBytes,
    limits.maximumIccProfileBytes,
    limits.maximumExifBytes,
    limits.maximumTotalAncillaryBytes,
    limits.maximumFrames,
    colorPolicy,
    "APPLY_1_TO_8_THEN_ORIENTATION_1",
  );
}

async function runNegative(fixtureId, expectedDisposition, operation) {
  let disposition = "PASS";
  try {
    const decoded = await operation();
    decoded.free();
  } catch (reason) {
    disposition = errorCode(reason);
  }
  return {
    fixtureId,
    expectedDisposition,
    actual: { disposition },
    passed: disposition === expectedDisposition,
  };
}

function errorCode(reason) {
  if (typeof reason === "string") {
    try {
      const parsed = JSON.parse(reason);
      if (typeof parsed.code === "string") return parsed.code;
    } catch {
      return "DECODE_TRAP";
    }
  }
  if (reason && typeof reason.message === "string") {
    try {
      const parsed = JSON.parse(reason.message);
      if (typeof parsed.code === "string") return parsed.code;
    } catch {
      return "DECODE_TRAP";
    }
  }
  return "DECODE_TRAP";
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stripShaPrefix(value) {
  return value.startsWith("sha256:") ? value.slice(7) : value;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}
