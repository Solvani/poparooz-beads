import { QuantizationWorkerError } from "./quantization-worker.errors";
import type { QuantizationWorkerFactory, WorkerLike } from "./worker-like";

export const createModuleQuantizationWorker: QuantizationWorkerFactory = () => {
  if (typeof Worker === "undefined") {
    throw new QuantizationWorkerError(
      "WORKER_UNAVAILABLE",
      "Background image processing is unavailable in this environment.",
    );
  }

  return new Worker(
    new URL("../../workers/quantization.worker.ts", import.meta.url),
    {
      type: "module",
      name: "poparooz-quantization-worker",
    },
  ) as WorkerLike;
};
