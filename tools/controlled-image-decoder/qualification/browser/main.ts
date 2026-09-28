import { ControlledDecoderWorkerClient } from "../../../../src/operator/controlled-generation/decoder/client";
import { ControlledDecoderError } from "../../../../src/operator/controlled-generation/decoder/protocol";
import type { ControlledCodec } from "../../../../src/operator/controlled-generation/decoder/protocol";

type GoldenCase = {
  fixtureId: string;
  sourceFilename: string;
  sourceSha256: string;
  actualCodec: ControlledCodec;
  expectedDisposition: string;
  expected: Record<string, unknown>;
};

declare global {
  interface Window {
    __qualificationResult?: unknown;
  }
}

const wasmUrl = new URL(
  "../../../../src/operator/controlled-generation/decoder/artifacts/1.0.0/poparooz-controlled-image-decoder-1_0_0_bg.wasm",
  import.meta.url,
);
const golden = (await fetch("/golden-manifest.json").then((response) =>
  response.json(),
)) as {
  wasmSha256: string;
  fixtureCount: number;
  cases: GoldenCase[];
};
const wasmBytes = new Uint8Array(
  await fetch(wasmUrl).then((response) => response.arrayBuffer()),
);

const client = new ControlledDecoderWorkerClient();
const cases: Array<Record<string, unknown>> = [];
let failures = 0;

try {
  await client.initializeControlledDecoder({
    wasmBytes: wasmBytes.slice(),
    expectedArtifactSha256: golden.wasmSha256,
  });

  for (const fixture of golden.cases) {
    const source = new Uint8Array(
      await fetch(`/${fixture.sourceFilename}`).then((response) =>
        response.arrayBuffer(),
      ),
    );
    let actual: Record<string, unknown>;
    try {
      const decoded = await client.decode(source, fixture.actualCodec);
      actual = {
        disposition: "PASS",
        encodedWidth: decoded.encodedWidth,
        encodedHeight: decoded.encodedHeight,
        decodedWidth: decoded.decodedWidth,
        decodedHeight: decoded.decodedHeight,
        orientationObserved: decoded.orientationObserved,
        orientationState: decoded.orientationState,
        iccState: decoded.iccState,
        pixelFormat: decoded.pixelFormat,
        decodedPixelSha256: decoded.decodedPixelSha256.replace(/^sha256:/, ""),
        rgbaByteLength: decoded.rgbaBytes.byteLength,
        actualCodec: decoded.actualCodec,
        decoderImplementationId: decoded.decoderImplementationId,
        decoderImplementationVersion: decoded.decoderImplementationVersion,
        runtimeAbiVersion: decoded.runtimeAbiVersion,
      };
    } catch (reason) {
      actual = { disposition: errorCode(reason) };
    }
    const passed = JSON.stringify(actual) === JSON.stringify(fixture.expected);
    if (!passed) failures += 1;
    cases.push({
      fixtureId: fixture.fixtureId,
      sourceSha256: fixture.sourceSha256,
      expectedDisposition: fixture.expectedDisposition,
      actual,
      passed,
    });
  }
} finally {
  client.terminate();
}

const mismatchClient = new ControlledDecoderWorkerClient();
let digestMismatch = "PASS";
try {
  await mismatchClient.initializeControlledDecoder({
    wasmBytes: wasmBytes.slice(),
    expectedArtifactSha256: "0".repeat(64),
  });
} catch (reason) {
  digestMismatch = errorCode(reason);
} finally {
  mismatchClient.terminate();
}
if (digestMismatch !== "ARTIFACT_DIGEST_MISMATCH") failures += 1;

const result = {
  schema: "PoparoozControlledDecoderQualificationResult/1.0.0",
  runner: "browser-worker",
  userAgent: navigator.userAgent,
  wasmSha256: golden.wasmSha256,
  fixtureCount: golden.fixtureCount,
  artifactDigestMismatch: digestMismatch,
  failures,
  cases,
};
window.__qualificationResult = result;
document.querySelector("#result")!.textContent = JSON.stringify(
  result,
  null,
  2,
);
document.body.dataset.qualification = failures === 0 ? "passed" : "failed";

function errorCode(reason: unknown): string {
  return reason instanceof ControlledDecoderError ? reason.code : "DECODE_TRAP";
}

export {};
