import type { RgbaImage } from "../../domain/image/image.types";
import { QuantizationError } from "../../domain/quantization/quantization-errors";
import {
  validateQuantizationImage,
  validateQuantizationOptions,
} from "../../domain/quantization/quantization-options";
import { validateQuantizedResult } from "../../domain/quantization/quantized-result-validation";
import type {
  QuantizationOptions,
  QuantizedImage,
} from "../../domain/quantization/quantization.types";
import {
  QUANTIZATION_WORKER_PROTOCOL_VERSION,
  parseQuantizationWorkerResponse,
  readSafeRequestId,
  type QuantizeImageWorkerRequest,
} from "../../workers/quantization-worker.protocol";
import { QuantizationWorkerError } from "./quantization-worker.errors";
import { createModuleQuantizationWorker } from "./quantization-worker.factory";
import type {
  QuantizationWorkerFactory,
  WorkerLike,
  WorkerLikeErrorEvent,
} from "./worker-like";

export type QuantizationWorkerClientState = "idle" | "processing" | "disposed";

interface ActiveJob {
  readonly requestId: number;
  readonly generation: number;
  readonly image: RgbaImage;
  readonly options: QuantizationOptions;
  readonly signal?: AbortSignal;
  readonly abortListener?: () => void;
  readonly resolve: (result: QuantizedImage) => void;
  readonly reject: (error: QuantizationWorkerError) => void;
}

export class QuantizationWorkerClient {
  private worker: WorkerLike | null = null;
  private workerGeneration = 0;
  private nextRequestId = 1;
  private activeJob: ActiveJob | null = null;
  private disposed = false;

  constructor(
    private readonly workerFactory: QuantizationWorkerFactory = createModuleQuantizationWorker,
  ) {}

  get state(): QuantizationWorkerClientState {
    if (this.disposed) return "disposed";
    return this.activeJob === null ? "idle" : "processing";
  }

  quantize(
    image: RgbaImage,
    options: QuantizationOptions,
    signal?: AbortSignal,
  ): Promise<QuantizedImage> {
    if (this.disposed) {
      return Promise.reject(
        new QuantizationWorkerError(
          "CLIENT_DISPOSED",
          "The background processing client has been disposed.",
        ),
      );
    }
    if (signal?.aborted === true) {
      return Promise.reject(
        new QuantizationWorkerError(
          "ABORTED",
          "Background image processing was cancelled.",
        ),
      );
    }

    try {
      validateQuantizationImage(image);
      validateQuantizationOptions(options);
    } catch (error) {
      return Promise.reject(
        new QuantizationWorkerError(
          "WORKER_PROCESSING_FAILED",
          "The image cannot be processed with these settings.",
          error instanceof QuantizationError ? error.code : undefined,
        ),
      );
    }

    if (!Number.isSafeInteger(this.nextRequestId)) {
      return Promise.reject(
        new QuantizationWorkerError(
          "WORKER_PROTOCOL_ERROR",
          "The background processing request sequence is exhausted.",
        ),
      );
    }

    if (this.activeJob !== null) {
      this.rejectActive(
        new QuantizationWorkerError(
          "SUPERSEDED",
          "Background image processing was replaced by a newer request.",
        ),
        true,
      );
    }

    let rgbaCopy: Uint8ClampedArray<ArrayBuffer>;
    try {
      rgbaCopy = new Uint8ClampedArray(image.data);
    } catch {
      return Promise.reject(
        new QuantizationWorkerError(
          "WORKER_PROCESSING_FAILED",
          "The image could not be prepared for background processing.",
        ),
      );
    }

    let worker: WorkerLike;
    try {
      worker = this.getOrCreateWorker();
    } catch (error) {
      if (
        error instanceof QuantizationWorkerError &&
        error.code === "WORKER_UNAVAILABLE"
      ) {
        return Promise.reject(error);
      }
      return Promise.reject(
        new QuantizationWorkerError(
          "WORKER_CREATION_FAILED",
          "Background image processing could not be started.",
        ),
      );
    }

    const requestId = this.nextRequestId;
    this.nextRequestId += 1;
    const generation = this.workerGeneration;
    const request: QuantizeImageWorkerRequest = {
      type: "QUANTIZE_IMAGE",
      protocolVersion: QUANTIZATION_WORKER_PROTOCOL_VERSION,
      requestId,
      payload: {
        width: image.width,
        height: image.height,
        rgbaBuffer: rgbaCopy.buffer,
        maxColors: options.maxColors,
        alphaThreshold: options.alphaThreshold,
      },
    };

    return new Promise<QuantizedImage>((resolve, reject) => {
      const abortListener = signal
        ? () => {
            if (
              this.activeJob?.requestId === requestId &&
              this.activeJob.generation === generation
            ) {
              this.rejectActive(
                new QuantizationWorkerError(
                  "ABORTED",
                  "Background image processing was cancelled.",
                ),
                true,
              );
            }
          }
        : undefined;

      this.activeJob = {
        requestId,
        generation,
        image,
        options,
        signal,
        abortListener,
        resolve,
        reject,
      };
      if (abortListener) signal?.addEventListener("abort", abortListener);

      try {
        worker.postMessage(request, [rgbaCopy.buffer]);
      } catch {
        this.rejectActive(
          new QuantizationWorkerError(
            "WORKER_POST_MESSAGE_FAILED",
            "The background processing request could not be sent.",
          ),
          true,
        );
      }
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.activeJob !== null) {
      this.rejectActive(
        new QuantizationWorkerError(
          "CLIENT_DISPOSED",
          "The background processing client has been disposed.",
        ),
        true,
      );
      return;
    }
    this.discardWorker();
  }

  private getOrCreateWorker(): WorkerLike {
    if (this.worker !== null) return this.worker;
    const worker = this.workerFactory();
    const generation = this.workerGeneration + 1;
    this.workerGeneration = generation;
    worker.onmessage = (event) => this.handleMessage(event.data, generation);
    worker.onerror = (event) => this.handleWorkerError(event, generation);
    worker.onmessageerror = () => this.handleMessageError(generation);
    this.worker = worker;
    return worker;
  }

  private handleMessage(message: unknown, generation: number): void {
    if (
      generation !== this.workerGeneration ||
      this.activeJob === null ||
      this.activeJob.generation !== generation
    ) {
      return;
    }

    const messageRequestId = readSafeRequestId(message);
    if (
      messageRequestId !== undefined &&
      messageRequestId !== this.activeJob.requestId
    ) {
      return;
    }

    let response;
    try {
      response = parseQuantizationWorkerResponse(message);
    } catch {
      this.rejectActive(
        new QuantizationWorkerError(
          "WORKER_PROTOCOL_ERROR",
          "The background processor returned an invalid message.",
        ),
        true,
      );
      return;
    }

    if (response.requestId !== this.activeJob.requestId) return;
    if (response.type === "QUANTIZATION_FAILED") {
      this.rejectActive(
        new QuantizationWorkerError(
          "WORKER_PROCESSING_FAILED",
          "Background image processing failed.",
          response.error.code,
        ),
        false,
      );
      return;
    }

    const activeJob = this.activeJob;
    const colorIndices = new Uint16Array(response.result.colorIndicesBuffer);
    const result: QuantizedImage = {
      width: response.result.width,
      height: response.result.height,
      colors: response.result.colors,
      colorIndices,
      transparentIndex: response.result.transparentIndex,
      opaquePixelCount: response.result.opaquePixelCount,
      transparentPixelCount: response.result.transparentPixelCount,
    };

    try {
      validateQuantizedResult(activeJob.image, activeJob.options, result);
    } catch {
      this.rejectActive(
        new QuantizationWorkerError(
          "INVALID_WORKER_RESULT",
          "The background processor returned an invalid result.",
        ),
        true,
      );
      return;
    }

    this.activeJob = null;
    this.removeAbortListener(activeJob);
    activeJob.resolve(result);
  }

  private handleWorkerError(
    event: WorkerLikeErrorEvent,
    generation: number,
  ): void {
    if (generation !== this.workerGeneration) return;
    event.preventDefault?.();
    if (this.activeJob !== null) {
      this.rejectActive(
        new QuantizationWorkerError(
          "WORKER_CRASHED",
          "The background processor stopped unexpectedly.",
        ),
        true,
      );
    } else {
      this.discardWorker();
    }
  }

  private handleMessageError(generation: number): void {
    if (generation !== this.workerGeneration) return;
    if (this.activeJob !== null) {
      this.rejectActive(
        new QuantizationWorkerError(
          "WORKER_MESSAGE_ERROR",
          "The background processor message could not be read.",
        ),
        true,
      );
    } else {
      this.discardWorker();
    }
  }

  private rejectActive(
    error: QuantizationWorkerError,
    discardWorker: boolean,
  ): void {
    const activeJob = this.activeJob;
    if (activeJob === null) return;
    this.activeJob = null;
    this.removeAbortListener(activeJob);
    activeJob.reject(error);
    if (discardWorker) this.discardWorker();
  }

  private removeAbortListener(activeJob: ActiveJob): void {
    if (activeJob.signal && activeJob.abortListener) {
      activeJob.signal.removeEventListener("abort", activeJob.abortListener);
    }
  }

  private discardWorker(): void {
    const worker = this.worker;
    if (worker === null) return;
    this.worker = null;
    this.workerGeneration += 1;
    worker.terminate();
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
  }
}
