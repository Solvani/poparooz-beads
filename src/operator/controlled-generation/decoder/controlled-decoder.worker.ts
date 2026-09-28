/// <reference lib="webworker" />

import init, {
  decode_controlled,
} from "./artifacts/1.0.0/poparooz-controlled-image-decoder-1_0_0.js";
import {
  CONTROLLED_DECODER_LIMITS,
  hasExactAuthorityTuple,
  sha256Hex,
} from "./authority";
import type {
  ControlledDecoderErrorCode,
  WorkerRequest,
  WorkerResponse,
} from "./protocol";

const scope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;
let decoderArtifactSha256: string | null = null;

function respond(message: WorkerResponse, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}

function errorCode(reason: unknown): ControlledDecoderErrorCode {
  if (typeof reason === "string") {
    try {
      const parsed = JSON.parse(reason) as {
        code?: ControlledDecoderErrorCode;
      };
      if (typeof parsed.code === "string") return parsed.code;
    } catch {
      // The closed failure below intentionally hides implementation detail.
    }
  }
  return "DECODE_TRAP";
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.version !== "PoparoozControlledDecoderWorker/1.0.0") {
    respond({
      kind: "ERROR",
      requestId: request.requestId,
      code: "RUNTIME_AUTHORITY_MISMATCH",
    });
    return;
  }

  if (request.kind === "INITIALIZE") {
    const actualDigest = await sha256Hex(request.wasmBytes);
    if (actualDigest !== request.expectedArtifactSha256) {
      respond({
        kind: "ERROR",
        requestId: request.requestId,
        code: "ARTIFACT_DIGEST_MISMATCH",
      });
      return;
    }
    if (!hasExactAuthorityTuple(request.expectedAuthorityTuple)) {
      respond({
        kind: "ERROR",
        requestId: request.requestId,
        code: "RUNTIME_AUTHORITY_MISMATCH",
      });
      return;
    }
    try {
      await init({ module_or_path: request.wasmBytes });
      decoderArtifactSha256 = actualDigest;
      respond({ kind: "READY", requestId: request.requestId });
    } catch {
      respond({
        kind: "ERROR",
        requestId: request.requestId,
        code: "DECODER_UNAVAILABLE",
      });
    }
    return;
  }

  if (decoderArtifactSha256 === null) {
    respond({
      kind: "ERROR",
      requestId: request.requestId,
      code: "DECODER_UNAVAILABLE",
    });
    return;
  }

  try {
    const decoded = decode_controlled(
      request.sourceBytes,
      request.expectedCodec,
      CONTROLLED_DECODER_LIMITS.maximumSourceByteLength,
      CONTROLLED_DECODER_LIMITS.maximumEncodedWidth,
      CONTROLLED_DECODER_LIMITS.maximumEncodedHeight,
      CONTROLLED_DECODER_LIMITS.maximumPixelCount,
      CONTROLLED_DECODER_LIMITS.maximumDecodedRgbaBytes,
      CONTROLLED_DECODER_LIMITS.maximumIccProfileBytes,
      CONTROLLED_DECODER_LIMITS.maximumExifBytes,
      CONTROLLED_DECODER_LIMITS.maximumTotalAncillaryMetadataBytes,
      CONTROLLED_DECODER_LIMITS.maximumFrames,
      "EXPLICIT_SRGB_V1",
      "APPLY_1_TO_8_THEN_ORIENTATION_1",
    );
    const rgbaBytes = decoded.rgba_bytes();
    respond(
      {
        kind: "DECODED",
        requestId: request.requestId,
        value: {
          encodedWidth: decoded.encoded_width,
          encodedHeight: decoded.encoded_height,
          decodedWidth: decoded.decoded_width,
          decodedHeight: decoded.decoded_height,
          orientationObserved: decoded.orientation_observed,
          orientationState: "ORIENTATION_1",
          iccState: decoded.icc_state,
          pixelFormat: "RGBA8_UNPREMULTIPLIED",
          rgbaBytes,
          decodedPixelSha256: decoded.decoded_pixel_sha256,
          actualCodec: decoded.actual_codec as "JPEG" | "PNG" | "WEBP",
          decoderImplementationId: "poparooz-controlled-image-decoder-wasm",
          decoderImplementationVersion: "1.0.0",
          decoderArtifactSha256,
          runtimeAbiVersion: "PoparoozControlledDecoderABI/1.0.0",
        },
      },
      [rgbaBytes.buffer],
    );
  } catch (reason) {
    respond({
      kind: "ERROR",
      requestId: request.requestId,
      code: errorCode(reason),
    });
  }
};

export {};
