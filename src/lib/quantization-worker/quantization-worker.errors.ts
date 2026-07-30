export const QUANTIZATION_WORKER_ERROR_CODES = [
  "WORKER_UNAVAILABLE",
  "WORKER_CREATION_FAILED",
  "WORKER_POST_MESSAGE_FAILED",
  "WORKER_CRASHED",
  "WORKER_MESSAGE_ERROR",
  "WORKER_PROTOCOL_ERROR",
  "WORKER_PROCESSING_FAILED",
  "INVALID_WORKER_RESULT",
  "ABORTED",
  "SUPERSEDED",
  "CLIENT_DISPOSED",
] as const;

export type QuantizationWorkerErrorCode =
  (typeof QUANTIZATION_WORKER_ERROR_CODES)[number];

export class QuantizationWorkerError extends Error {
  readonly code: QuantizationWorkerErrorCode;
  readonly causeCode?: string;

  constructor(
    code: QuantizationWorkerErrorCode,
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "QuantizationWorkerError";
    this.code = code;
    this.causeCode = causeCode;
  }
}
