import { QuantizationError } from "../domain/quantization/quantization-errors";
import { quantizeImage } from "../domain/quantization/quantize-image";
import type {
  QuantizationOptions,
  QuantizedImage,
} from "../domain/quantization/quantization.types";
import type { RgbaImage } from "../domain/image/image.types";
import {
  QUANTIZATION_WORKER_PROTOCOL_VERSION,
  parseQuantizeImageWorkerRequest,
  readSafeRequestId,
  type QuantizationWorkerResponse,
} from "./quantization-worker.protocol";

export interface QuantizationWorkerRuntimeResult {
  readonly response: QuantizationWorkerResponse;
  readonly transferables: readonly ArrayBuffer[];
}

type Quantizer = (
  image: RgbaImage,
  options: QuantizationOptions,
) => QuantizedImage;

function failure(
  requestId: number,
  code: string,
  message: string,
): QuantizationWorkerRuntimeResult {
  return {
    response: {
      type: "QUANTIZATION_FAILED",
      protocolVersion: QUANTIZATION_WORKER_PROTOCOL_VERSION,
      requestId,
      error: { code, message },
    },
    transferables: [],
  };
}

export function createQuantizationWorkerRuntime(
  quantizer: Quantizer = quantizeImage,
): (message: unknown) => QuantizationWorkerRuntimeResult {
  return (message) => {
    const fallbackRequestId = readSafeRequestId(message) ?? 1;
    let request;
    try {
      request = parseQuantizeImageWorkerRequest(message);
    } catch {
      return failure(
        fallbackRequestId,
        "WORKER_PROTOCOL_ERROR",
        "The quantization worker request is invalid.",
      );
    }

    try {
      const result = quantizer(
        {
          width: request.payload.width,
          height: request.payload.height,
          data: new Uint8ClampedArray(request.payload.rgbaBuffer),
        },
        {
          maxColors: request.payload.maxColors,
          alphaThreshold: request.payload.alphaThreshold,
        },
      );
      const colorIndicesBuffer = result.colorIndices.buffer as ArrayBuffer;
      const response: QuantizationWorkerResponse = {
        type: "QUANTIZATION_SUCCEEDED",
        protocolVersion: QUANTIZATION_WORKER_PROTOCOL_VERSION,
        requestId: request.requestId,
        result: {
          width: result.width,
          height: result.height,
          colors: result.colors,
          colorIndicesBuffer,
          transparentIndex: result.transparentIndex,
          opaquePixelCount: result.opaquePixelCount,
          transparentPixelCount: result.transparentPixelCount,
        },
      };
      return { response, transferables: [colorIndicesBuffer] };
    } catch (error) {
      if (error instanceof QuantizationError) {
        return failure(request.requestId, error.code, error.message);
      }
      return failure(
        request.requestId,
        "QUANTIZATION_FAILED",
        "Image quantization failed.",
      );
    }
  };
}

export const processQuantizationWorkerMessage =
  createQuantizationWorkerRuntime();
