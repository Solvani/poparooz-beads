export interface WorkerLikeMessageEvent {
  readonly data: unknown;
}

export interface WorkerLikeErrorEvent {
  preventDefault?(): void;
}

export interface WorkerLike {
  onmessage: ((event: WorkerLikeMessageEvent) => void) | null;
  onerror: ((event: WorkerLikeErrorEvent) => void) | null;
  onmessageerror: ((event: WorkerLikeMessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: readonly ArrayBuffer[]): void;
  terminate(): void;
}

export type QuantizationWorkerFactory = () => WorkerLike;
