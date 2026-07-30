import { describe, expect, it } from "vitest";

import { QuantizationError } from "../domain/quantization/quantization-errors";
import {
  createQuantizationWorkerRuntime,
  processQuantizationWorkerMessage,
} from "./quantization-worker.runtime";

function request(
  data = new Uint8ClampedArray([
    255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0,
  ]),
) {
  return {
    type: "QUANTIZE_IMAGE",
    protocolVersion: 1,
    requestId: 7,
    payload: {
      width: 2,
      height: 2,
      rgbaBuffer: data.buffer,
      maxColors: 2,
      alphaThreshold: 0,
    },
  };
}

describe("quantization worker runtime", () => {
  it("quantizes a 2x2 image and transfers only its index buffer", () => {
    const input = request();
    const before = new Uint8ClampedArray(input.payload.rgbaBuffer).slice();
    const output = processQuantizationWorkerMessage(input);

    expect(output.response.type).toBe("QUANTIZATION_SUCCEEDED");
    if (output.response.type !== "QUANTIZATION_SUCCEEDED") return;
    expect(output.response.result).toMatchObject({
      width: 2,
      height: 2,
      opaquePixelCount: 3,
      transparentPixelCount: 1,
      transparentIndex: 65535,
    });
    expect([
      ...new Uint16Array(output.response.result.colorIndicesBuffer),
    ]).toEqual([1, 1, 0, 65535]);
    expect(output.transferables).toEqual([
      output.response.result.colorIndicesBuffer,
    ]);
    expect(output.transferables).not.toContain(input.payload.rgbaBuffer);
    expect(new Uint8ClampedArray(input.payload.rgbaBuffer)).toEqual(before);
    expect("stack" in output.response).toBe(false);
  });

  it("maps known domain errors to safe failures with no transferables", () => {
    const runtime = createQuantizationWorkerRuntime(() => {
      throw new QuantizationError(
        "NO_QUANTIZABLE_PIXELS",
        "The image contains no pixels above the alpha threshold.",
      );
    });
    const output = runtime(request());
    expect(output).toEqual({
      response: {
        type: "QUANTIZATION_FAILED",
        protocolVersion: 1,
        requestId: 7,
        error: {
          code: "NO_QUANTIZABLE_PIXELS",
          message: "The image contains no pixels above the alpha threshold.",
        },
      },
      transferables: [],
    });
  });

  it("maps unknown exceptions without leaking their message or stack", () => {
    const runtime = createQuantizationWorkerRuntime(() => {
      throw new Error("private path C:\\secret\\image.png");
    });
    const output = runtime(request());
    expect(output.response).toEqual({
      type: "QUANTIZATION_FAILED",
      protocolVersion: 1,
      requestId: 7,
      error: {
        code: "QUANTIZATION_FAILED",
        message: "Image quantization failed.",
      },
    });
    expect(JSON.stringify(output)).not.toContain("secret");
  });

  it("returns a safe protocol failure even when requestId is unreadable", () => {
    const output = processQuantizationWorkerMessage({
      type: "BAD",
      requestId: -1,
    });
    expect(output.response).toEqual({
      type: "QUANTIZATION_FAILED",
      protocolVersion: 1,
      requestId: 1,
      error: {
        code: "WORKER_PROTOCOL_ERROR",
        message: "The quantization worker request is invalid.",
      },
    });
    expect(output.transferables).toEqual([]);
  });
});
