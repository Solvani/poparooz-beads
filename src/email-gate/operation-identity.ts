export interface EmailGateOperationIdentity {
  begin(): Readonly<{ generation: number; signal: AbortSignal }>;
  isCurrent(generation: number): boolean;
  supersede(): void;
}

export function createEmailGateOperationIdentity(): EmailGateOperationIdentity {
  let generation = 0;
  let controller: AbortController | null = null;
  return Object.freeze({
    begin() {
      generation += 1;
      controller?.abort();
      controller = new AbortController();
      return { generation, signal: controller.signal };
    },
    isCurrent(candidate: number) {
      return candidate === generation;
    },
    supersede() {
      generation += 1;
      controller?.abort();
      controller = null;
    },
  });
}
