import { describe, expect, it } from "vitest";

import {
  QUANTIZATION_WORKER_PROTOCOL_VERSION,
  QuantizationWorkerProtocolError,
  parseQuantizationWorkerResponse,
  parseQuantizeImageWorkerRequest,
} from "./quantization-worker.protocol";

function validRequest(): Record<string, unknown> {
  return {
    type: "QUANTIZE_IMAGE",
    protocolVersion: 1,
    requestId: 1,
    payload: {
      width: 1,
      height: 1,
      rgbaBuffer: new ArrayBuffer(4),
      maxColors: 1,
      alphaThreshold: 0,
    },
  };
}

describe("quantization worker protocol", () => {
  it("freezes protocol version 1 and accepts a valid request", () => {
    expect(QUANTIZATION_WORKER_PROTOCOL_VERSION).toBe(1);
    expect(parseQuantizeImageWorkerRequest(validRequest()).requestId).toBe(1);
  });

  it.each([
    ["unknown type", { ...validRequest(), type: "OTHER" }],
    ["wrong version", { ...validRequest(), protocolVersion: 2 }],
    ["invalid request id", { ...validRequest(), requestId: 0 }],
    [
      "missing payload",
      { type: "QUANTIZE_IMAGE", protocolVersion: 1, requestId: 1 },
    ],
    ["unknown top-level field", { ...validRequest(), extra: true }],
  ])("rejects %s", (_label, request) => {
    expect(() => parseQuantizeImageWorkerRequest(request)).toThrow(
      QuantizationWorkerProtocolError,
    );
  });

  it("rejects non-ArrayBuffer and incorrect buffer lengths", () => {
    const request = validRequest();
    expect(() =>
      parseQuantizeImageWorkerRequest({
        ...request,
        payload: {
          ...(request.payload as object),
          rgbaBuffer: new Uint8Array(4),
        },
      }),
    ).toThrow(QuantizationWorkerProtocolError);
    expect(() =>
      parseQuantizeImageWorkerRequest({
        ...request,
        payload: {
          ...(request.payload as object),
          rgbaBuffer: new ArrayBuffer(3),
        },
      }),
    ).toThrow(QuantizationWorkerProtocolError);
  });

  it("rejects SharedArrayBuffer when the environment supports it", () => {
    if (typeof SharedArrayBuffer === "undefined") return;
    const request = validRequest();
    expect(() =>
      parseQuantizeImageWorkerRequest({
        ...request,
        payload: {
          ...(request.payload as object),
          rgbaBuffer: new SharedArrayBuffer(4),
        },
      }),
    ).toThrow(QuantizationWorkerProtocolError);
  });

  it("strictly validates success and failure response shapes", () => {
    const success = {
      type: "QUANTIZATION_SUCCEEDED",
      protocolVersion: 1,
      requestId: 1,
      result: {
        width: 1,
        height: 1,
        colors: [
          {
            index: 0,
            rgb: { r: 1, g: 2, b: 3 },
            lab: { l: 1, a: 2, b: 3 },
            pixelCount: 1,
          },
        ],
        colorIndicesBuffer: new Uint16Array([0]).buffer,
        transparentIndex: 65535,
        opaquePixelCount: 1,
        transparentPixelCount: 0,
      },
    };
    expect(parseQuantizationWorkerResponse(success).type).toBe(
      "QUANTIZATION_SUCCEEDED",
    );
    expect(() =>
      parseQuantizationWorkerResponse({
        ...success,
        result: { ...success.result, extra: true },
      }),
    ).toThrow(QuantizationWorkerProtocolError);
    expect(() =>
      parseQuantizationWorkerResponse({
        type: "QUANTIZATION_FAILED",
        protocolVersion: 1,
        requestId: 1,
        error: { message: "safe" },
      }),
    ).toThrow(QuantizationWorkerProtocolError);
  });
});
