import type { QuantizedColor } from "../domain/quantization/quantization.types";

export const QUANTIZATION_WORKER_PROTOCOL_VERSION = 1 as const;

export interface QuantizeImageWorkerRequest {
  readonly type: "QUANTIZE_IMAGE";
  readonly protocolVersion: typeof QUANTIZATION_WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly payload: {
    readonly width: number;
    readonly height: number;
    readonly rgbaBuffer: ArrayBuffer;
    readonly maxColors: number;
    readonly alphaThreshold: number;
  };
}

export type SerializedQuantizedColor = QuantizedColor;

export interface QuantizeImageWorkerSuccess {
  readonly type: "QUANTIZATION_SUCCEEDED";
  readonly protocolVersion: typeof QUANTIZATION_WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly result: {
    readonly width: number;
    readonly height: number;
    readonly colors: readonly SerializedQuantizedColor[];
    readonly colorIndicesBuffer: ArrayBuffer;
    readonly transparentIndex: number;
    readonly opaquePixelCount: number;
    readonly transparentPixelCount: number;
  };
}

export interface QuantizeImageWorkerFailure {
  readonly type: "QUANTIZATION_FAILED";
  readonly protocolVersion: typeof QUANTIZATION_WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export type QuantizationWorkerResponse =
  QuantizeImageWorkerSuccess | QuantizeImageWorkerFailure;

export class QuantizationWorkerProtocolError extends Error {
  constructor() {
    super("The quantization worker message is invalid.");
    this.name = "QuantizationWorkerProtocolError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isByte(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 255
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isRealArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

export function readSafeRequestId(value: unknown): number | undefined {
  try {
    if (!isRecord(value)) return undefined;
    return isPositiveSafeInteger(value.requestId) ? value.requestId : undefined;
  } catch {
    return undefined;
  }
}

export function parseQuantizeImageWorkerRequest(
  value: unknown,
): QuantizeImageWorkerRequest {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["type", "protocolVersion", "requestId", "payload"]) ||
    value.type !== "QUANTIZE_IMAGE" ||
    value.protocolVersion !== QUANTIZATION_WORKER_PROTOCOL_VERSION ||
    !isPositiveSafeInteger(value.requestId) ||
    !isRecord(value.payload) ||
    !hasExactKeys(value.payload, [
      "width",
      "height",
      "rgbaBuffer",
      "maxColors",
      "alphaThreshold",
    ]) ||
    !isPositiveSafeInteger(value.payload.width) ||
    !isPositiveSafeInteger(value.payload.height) ||
    !isRealArrayBuffer(value.payload.rgbaBuffer)
  ) {
    throw new QuantizationWorkerProtocolError();
  }

  const pixelCount = value.payload.width * value.payload.height;
  if (
    !Number.isSafeInteger(pixelCount) ||
    pixelCount > Math.floor(Number.MAX_SAFE_INTEGER / 4) ||
    value.payload.rgbaBuffer.byteLength !== pixelCount * 4
  ) {
    throw new QuantizationWorkerProtocolError();
  }

  return value as unknown as QuantizeImageWorkerRequest;
}

function isSerializedColor(value: unknown): value is SerializedQuantizedColor {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["index", "rgb", "lab", "pixelCount"]) ||
    !isNonNegativeSafeInteger(value.index) ||
    !isPositiveSafeInteger(value.pixelCount) ||
    !isRecord(value.rgb) ||
    !hasExactKeys(value.rgb, ["r", "g", "b"]) ||
    !isByte(value.rgb.r) ||
    !isByte(value.rgb.g) ||
    !isByte(value.rgb.b) ||
    !isRecord(value.lab) ||
    !hasExactKeys(value.lab, ["l", "a", "b"]) ||
    !isFiniteNumber(value.lab.l) ||
    !isFiniteNumber(value.lab.a) ||
    !isFiniteNumber(value.lab.b)
  ) {
    return false;
  }
  return ![value.lab.l, value.lab.a, value.lab.b].some((item) =>
    Object.is(item, -0),
  );
}

function parseSuccess(
  value: Record<string, unknown>,
): QuantizeImageWorkerSuccess {
  if (
    !hasExactKeys(value, ["type", "protocolVersion", "requestId", "result"]) ||
    value.protocolVersion !== QUANTIZATION_WORKER_PROTOCOL_VERSION ||
    !isPositiveSafeInteger(value.requestId) ||
    !isRecord(value.result) ||
    !hasExactKeys(value.result, [
      "width",
      "height",
      "colors",
      "colorIndicesBuffer",
      "transparentIndex",
      "opaquePixelCount",
      "transparentPixelCount",
    ]) ||
    !isPositiveSafeInteger(value.result.width) ||
    !isPositiveSafeInteger(value.result.height) ||
    !Array.isArray(value.result.colors) ||
    !value.result.colors.every(isSerializedColor) ||
    !isRealArrayBuffer(value.result.colorIndicesBuffer) ||
    value.result.colorIndicesBuffer.byteLength %
      Uint16Array.BYTES_PER_ELEMENT !==
      0 ||
    !isNonNegativeSafeInteger(value.result.transparentIndex) ||
    !isNonNegativeSafeInteger(value.result.opaquePixelCount) ||
    !isNonNegativeSafeInteger(value.result.transparentPixelCount)
  ) {
    throw new QuantizationWorkerProtocolError();
  }
  return value as unknown as QuantizeImageWorkerSuccess;
}

function parseFailure(
  value: Record<string, unknown>,
): QuantizeImageWorkerFailure {
  if (
    !hasExactKeys(value, ["type", "protocolVersion", "requestId", "error"]) ||
    value.protocolVersion !== QUANTIZATION_WORKER_PROTOCOL_VERSION ||
    !isPositiveSafeInteger(value.requestId) ||
    !isRecord(value.error) ||
    !hasExactKeys(value.error, ["code", "message"]) ||
    typeof value.error.code !== "string" ||
    value.error.code.length === 0 ||
    typeof value.error.message !== "string" ||
    value.error.message.length === 0
  ) {
    throw new QuantizationWorkerProtocolError();
  }
  return value as unknown as QuantizeImageWorkerFailure;
}

export function parseQuantizationWorkerResponse(
  value: unknown,
): QuantizationWorkerResponse {
  if (!isRecord(value)) throw new QuantizationWorkerProtocolError();
  if (value.type === "QUANTIZATION_SUCCEEDED") return parseSuccess(value);
  if (value.type === "QUANTIZATION_FAILED") return parseFailure(value);
  throw new QuantizationWorkerProtocolError();
}
