import {
  CONTROLLED_DECODER_LIMITS,
  EXPECTED_CONTROLLED_DECODER_AUTHORITY,
} from "./authority";
import {
  ControlledDecoderError,
  type ControlledCodec,
  type DecodedImageAuthority,
  type WorkerRequest,
  type WorkerResponse,
} from "./protocol";

type PendingRequest = {
  readonly resolve: (value: WorkerResponse) => void;
  readonly reject: (reason: ControlledDecoderError) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
};

export class ControlledDecoderWorkerClient {
  readonly #worker: Worker;
  readonly #pending = new Map<string, PendingRequest>();

  constructor(
    worker = new Worker(
      new URL("./controlled-decoder.worker.ts", import.meta.url),
      { type: "module" },
    ),
  ) {
    this.#worker = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const pending = this.#pending.get(event.data.requestId);
      if (pending === undefined) return;
      clearTimeout(pending.timeout);
      this.#pending.delete(event.data.requestId);
      if (event.data.kind === "ERROR")
        pending.reject(new ControlledDecoderError(event.data.code));
      else pending.resolve(event.data);
    };
    worker.onerror = () => this.#failAll("DECODE_TRAP");
  }

  async initializeControlledDecoder(input: {
    readonly wasmBytes: Uint8Array;
    readonly expectedArtifactSha256: string;
  }): Promise<void> {
    const response = await this.#request({
      version: "PoparoozControlledDecoderWorker/1.0.0",
      kind: "INITIALIZE",
      requestId: crypto.randomUUID(),
      wasmBytes: input.wasmBytes,
      expectedArtifactSha256: input.expectedArtifactSha256,
      expectedAuthorityTuple: EXPECTED_CONTROLLED_DECODER_AUTHORITY,
    });
    if (response.kind !== "READY")
      throw new ControlledDecoderError("DECODER_UNAVAILABLE");
  }

  async decode(
    sourceBytes: Uint8Array,
    expectedCodec: ControlledCodec,
  ): Promise<DecodedImageAuthority> {
    const response = await this.#request({
      version: "PoparoozControlledDecoderWorker/1.0.0",
      kind: "DECODE",
      requestId: crypto.randomUUID(),
      sourceBytes,
      expectedCodec,
    });
    if (response.kind !== "DECODED")
      throw new ControlledDecoderError("DECODE_FAILED");
    return response.value;
  }

  terminate(): void {
    this.#worker.terminate();
    this.#failAll("DECODER_UNAVAILABLE");
  }

  #request(request: WorkerRequest): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(request.requestId);
        this.#worker.terminate();
        reject(new ControlledDecoderError("DECODE_TIMEOUT"));
      }, CONTROLLED_DECODER_LIMITS.decodeWallClockTimeout);
      this.#pending.set(request.requestId, { resolve, reject, timeout });
      const bytes =
        request.kind === "INITIALIZE" ? request.wasmBytes : request.sourceBytes;
      this.#worker.postMessage(request, [bytes.buffer]);
    });
  }

  #failAll(code: "DECODER_UNAVAILABLE" | "DECODE_TRAP"): void {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new ControlledDecoderError(code));
    }
    this.#pending.clear();
  }
}
