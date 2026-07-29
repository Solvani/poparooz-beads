import { ImagePipelineError } from "../../domain/image/image-errors";

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ImagePipelineError("ABORTED", "Image processing was cancelled.");
  }
}

export function awaitWithAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
  onLateResolve?: (value: T) => void,
): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(
      new ImagePipelineError("ABORTED", "Image processing was cancelled."),
    );
  }
  if (signal === undefined) return promise;

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      reject(
        new ImagePipelineError("ABORTED", "Image processing was cancelled."),
      );
    };
    signal.addEventListener("abort", onAbort, { once: true });

    void promise.then(
      (value) => {
        if (settled) {
          onLateResolve?.(value);
          return;
        }
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}
