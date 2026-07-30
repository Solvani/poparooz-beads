import { processQuantizationWorkerMessage } from "./quantization-worker.runtime";

interface QuantizationWorkerScope {
  onmessage: ((event: { readonly data: unknown }) => void) | null;
  postMessage(message: unknown, transfer: readonly ArrayBuffer[]): void;
}

const workerScope = self as unknown as QuantizationWorkerScope;

workerScope.onmessage = (event) => {
  const { response, transferables } = processQuantizationWorkerMessage(
    event.data,
  );
  workerScope.postMessage(response, transferables);
};
