import artifactManifest from "./artifacts/1.0.0/artifact-manifest.json";
import wasmUrl from "./artifacts/1.0.0/poparooz-controlled-image-decoder-1_0_0_bg.wasm?url";
import { ControlledDecoderWorkerClient } from "./client";

const EXPECTED_RGBA = [
  10, 20, 30, 0, 11, 21, 31, 1, 12, 22, 32, 127, 13, 23, 33, 128, 14, 24, 34,
  254, 15, 25, 35, 255,
] as const;
const SOURCE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAYAAAABCAYAAAD9yd/wAAAAAXNSR0IB2cksfwAAACFJREFUeNpj4BKRY+AWlWfkEVOo5xVXbOCTUPrHL6n8HwAkWQSToJ7ZfQAAAABJRU5ErkJggg==";

const result = await qualify();
document.body.dataset.qualification = result.status;
document.body.textContent = JSON.stringify(result);

async function qualify() {
  const started = performance.now();
  const wasmBytes = new Uint8Array(await (await fetch(wasmUrl)).arrayBuffer());
  const client = new ControlledDecoderWorkerClient();
  try {
    await client.initializeControlledDecoder({
      wasmBytes,
      expectedArtifactSha256: artifactManifest.decoderArtifactSha256,
    });
    const initializationMilliseconds = performance.now() - started;
    const decodeStarted = performance.now();
    const decoded = await client.decode(fromBase64(SOURCE_BASE64), "PNG");
    const decodeMilliseconds = performance.now() - decodeStarted;
    const byteEqual =
      decoded.rgbaBytes.length === EXPECTED_RGBA.length &&
      decoded.rgbaBytes.every((value, index) => value === EXPECTED_RGBA[index]);
    return {
      status: byteEqual ? "PASS" : "FAIL",
      runtime: navigator.userAgent,
      wasmSha256: decoded.decoderArtifactSha256,
      decodedPixelSha256: decoded.decodedPixelSha256,
      byteEqual,
      initializationMilliseconds,
      decodeMilliseconds,
    };
  } catch (error) {
    return {
      status: "FAIL",
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  } finally {
    client.terminate();
  }
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
