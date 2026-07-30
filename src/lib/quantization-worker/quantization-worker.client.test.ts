import { describe, expect, it, vi } from "vitest";

import type { RgbaImage } from "../../domain/image/image.types";
import { processQuantizationWorkerMessage } from "../../workers/quantization-worker.runtime";
import type { QuantizeImageWorkerRequest } from "../../workers/quantization-worker.protocol";
import { QuantizationWorkerClient } from "./quantization-worker.client";
import { QuantizationWorkerError } from "./quantization-worker.errors";
import type {
  WorkerLike,
  WorkerLikeErrorEvent,
  WorkerLikeMessageEvent,
} from "./worker-like";

class FakeWorker implements WorkerLike {
  onmessage: ((event: WorkerLikeMessageEvent) => void) | null = null;
  onerror: ((event: WorkerLikeErrorEvent) => void) | null = null;
  onmessageerror: ((event: WorkerLikeMessageEvent) => void) | null = null;
  readonly posts: Array<{
    message: QuantizeImageWorkerRequest;
    transfer: readonly ArrayBuffer[];
  }> = [];
  terminateCount = 0;
  postError: Error | null = null;

  postMessage(message: unknown, transfer: readonly ArrayBuffer[] = []): void {
    if (this.postError) throw this.postError;
    this.posts.push({
      message: message as QuantizeImageWorkerRequest,
      transfer,
    });
  }

  terminate(): void {
    this.terminateCount += 1;
  }

  respond(
    index = this.posts.length - 1,
  ): ReturnType<typeof processQuantizationWorkerMessage> {
    const post = this.posts[index]!;
    const output = processQuantizationWorkerMessage(post.message);
    this.onmessage?.({ data: output.response });
    return output;
  }
}

function redImage(): RgbaImage {
  return {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255]),
  };
}

const options = { maxColors: 1, alphaThreshold: 0 } as const;

function fakeFactory() {
  const workers: FakeWorker[] = [];
  return {
    workers,
    factory: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  };
}

async function expectWorkerError(
  promise: Promise<unknown>,
  code: QuantizationWorkerError["code"],
): Promise<QuantizationWorkerError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(QuantizationWorkerError);
    expect((error as QuantizationWorkerError).code).toBe(code);
    return error as QuantizationWorkerError;
  }
  throw new Error("Expected the promise to reject.");
}

describe("QuantizationWorkerClient transfer ownership", () => {
  it("lazily creates a worker and transfers an exact input copy", async () => {
    const { workers, factory } = fakeFactory();
    const image = redImage();
    const original = image.data.slice();
    const client = new QuantizationWorkerClient(factory);
    expect(workers).toHaveLength(0);

    const pending = client.quantize(image, options);
    expect(workers).toHaveLength(1);
    const post = workers[0]!.posts[0]!;
    expect(post.message.payload.rgbaBuffer).not.toBe(image.data.buffer);
    expect(post.transfer).toEqual([post.message.payload.rgbaBuffer]);
    expect([...new Uint8ClampedArray(post.message.payload.rgbaBuffer)]).toEqual(
      [...original],
    );
    expect(image.data).toEqual(original);

    const output = workers[0]!.respond();
    const result = await pending;
    if (output.response.type !== "QUANTIZATION_SUCCEEDED") return;
    expect(result.colorIndices.buffer).toBe(
      output.response.result.colorIndicesBuffer,
    );
    expect(result.colorIndices.buffer).not.toBe(
      post.message.payload.rgbaBuffer,
    );
  });

  it("copies only the visible region of a typed array with byteOffset", async () => {
    const { workers, factory } = fakeFactory();
    const backing = new ArrayBuffer(12);
    const full = new Uint8ClampedArray(backing);
    full.set([9, 9, 9, 9, 10, 20, 30, 255, 8, 8, 8, 8]);
    const image = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(backing, 4, 4),
    };
    const client = new QuantizationWorkerClient(factory);
    const pending = client.quantize(image, options);
    const post = workers[0]!.posts[0]!;
    expect(post.message.payload.rgbaBuffer.byteLength).toBe(4);
    expect([...new Uint8ClampedArray(post.message.payload.rgbaBuffer)]).toEqual(
      [10, 20, 30, 255],
    );
    expect(backing.byteLength).toBe(12);
    workers[0]!.respond();
    await pending;
  });

  it("keeps output buffers independent across reused tasks", async () => {
    const { workers, factory } = fakeFactory();
    const client = new QuantizationWorkerClient(factory);
    const first = client.quantize(redImage(), options);
    workers[0]!.respond();
    const firstResult = await first;
    const second = client.quantize(redImage(), options);
    workers[0]!.respond();
    const secondResult = await second;
    expect(workers).toHaveLength(1);
    expect(firstResult.colorIndices.buffer).not.toBe(
      secondResult.colorIndices.buffer,
    );
  });
});

describe("QuantizationWorkerClient cancellation and stale responses", () => {
  it("rejects a pre-aborted call without creating or posting to a worker", async () => {
    const { workers, factory } = fakeFactory();
    const controller = new AbortController();
    controller.abort("private reason");
    const client = new QuantizationWorkerClient(factory);
    const error = await expectWorkerError(
      client.quantize(redImage(), options, controller.signal),
      "ABORTED",
    );
    expect(workers).toHaveLength(0);
    expect(error.message).not.toContain("private reason");
  });

  it("hard-cancels an active task, removes its listener, and rebuilds", async () => {
    const { workers, factory } = fakeFactory();
    const controller = new AbortController();
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");
    const image = redImage();
    const original = image.data.slice();
    const client = new QuantizationWorkerClient(factory);
    const first = client.quantize(image, options, controller.signal);
    controller.abort();
    await expectWorkerError(first, "ABORTED");
    expect(workers[0]!.terminateCount).toBe(1);
    expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(image.data).toEqual(original);

    const retry = client.quantize(image, options);
    expect(workers).toHaveLength(2);
    workers[1]!.respond();
    await expect(retry).resolves.toMatchObject({ width: 1, height: 1 });
  });

  it("removes the abort listener after success and ignores later abort", async () => {
    const { workers, factory } = fakeFactory();
    const controller = new AbortController();
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");
    const client = new QuantizationWorkerClient(factory);
    const pending = client.quantize(redImage(), options, controller.signal);
    workers[0]!.respond();
    await expect(pending).resolves.toBeDefined();
    controller.abort();
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(workers[0]!.terminateCount).toBe(0);
    expect(client.state).toBe("idle");
  });

  it("supersedes an active task and protects the new task from late callbacks", async () => {
    const { workers, factory } = fakeFactory();
    const client = new QuantizationWorkerClient(factory);
    const first = client.quantize(redImage(), options);
    const observedFirst = first.catch((error: unknown) => error);
    const oldWorker = workers[0]!;
    const lateCallback = oldWorker.onmessage!;
    const lateSuccess = processQuantizationWorkerMessage(
      oldWorker.posts[0]!.message,
    ).response;

    const second = client.quantize(redImage(), options);
    expect(((await observedFirst) as QuantizationWorkerError).code).toBe(
      "SUPERSEDED",
    );
    expect(oldWorker.terminateCount).toBe(1);
    expect(workers).toHaveLength(2);
    lateCallback({ data: lateSuccess });
    expect(client.state).toBe("processing");
    workers[1]!.respond();
    await expect(second).resolves.toBeDefined();
  });

  it("ignores a mismatched requestId from the current generation", async () => {
    const { workers, factory } = fakeFactory();
    const client = new QuantizationWorkerClient(factory);
    const pending = client.quantize(redImage(), options);
    const valid = processQuantizationWorkerMessage(
      workers[0]!.posts[0]!.message,
    ).response;
    workers[0]!.onmessage?.({
      data: { ...valid, requestId: valid.requestId + 100 },
    });
    expect(client.state).toBe("processing");
    workers[0]!.onmessage?.({ data: valid });
    await expect(pending).resolves.toBeDefined();
  });
});

describe("QuantizationWorkerClient error and lifecycle handling", () => {
  it("maps a safe worker failure and keeps the healthy worker reusable", async () => {
    const { workers, factory } = fakeFactory();
    const client = new QuantizationWorkerClient(factory);
    const pending = client.quantize(redImage(), options);
    const requestId = workers[0]!.posts[0]!.message.requestId;
    workers[0]!.onmessage?.({
      data: {
        type: "QUANTIZATION_FAILED",
        protocolVersion: 1,
        requestId,
        error: { code: "NO_QUANTIZABLE_PIXELS", message: "Safe failure." },
      },
    });
    const error = await expectWorkerError(pending, "WORKER_PROCESSING_FAILED");
    expect(error.causeCode).toBe("NO_QUANTIZABLE_PIXELS");
    expect(workers[0]!.terminateCount).toBe(0);
    const next = client.quantize(redImage(), options);
    workers[0]!.respond();
    await expect(next).resolves.toBeDefined();
  });

  it("terminates on malformed protocol and invalid result invariants", async () => {
    const firstSet = fakeFactory();
    const firstClient = new QuantizationWorkerClient(firstSet.factory);
    const malformed = firstClient.quantize(redImage(), options);
    const requestId = firstSet.workers[0]!.posts[0]!.message.requestId;
    firstSet.workers[0]!.onmessage?.({
      data: { type: "BROKEN", protocolVersion: 1, requestId },
    });
    await expectWorkerError(malformed, "WORKER_PROTOCOL_ERROR");
    expect(firstSet.workers[0]!.terminateCount).toBe(1);

    const secondSet = fakeFactory();
    const secondClient = new QuantizationWorkerClient(secondSet.factory);
    const invalid = secondClient.quantize(redImage(), options);
    const output = processQuantizationWorkerMessage(
      secondSet.workers[0]!.posts[0]!.message,
    );
    if (output.response.type !== "QUANTIZATION_SUCCEEDED") return;
    secondSet.workers[0]!.onmessage?.({
      data: {
        ...output.response,
        result: { ...output.response.result, opaquePixelCount: 0 },
      },
    });
    await expectWorkerError(invalid, "INVALID_WORKER_RESULT");
    expect(secondSet.workers[0]!.terminateCount).toBe(1);
  });

  it.each([
    ["error", "WORKER_CRASHED"],
    ["messageerror", "WORKER_MESSAGE_ERROR"],
  ] as const)("handles worker %s and rebuilds", async (event, code) => {
    const { workers, factory } = fakeFactory();
    const client = new QuantizationWorkerClient(factory);
    const pending = client.quantize(redImage(), options);
    if (event === "error") {
      workers[0]!.onerror?.({ preventDefault: vi.fn() });
    } else {
      workers[0]!.onmessageerror?.({ data: null });
    }
    await expectWorkerError(pending, code);
    expect(workers[0]!.terminateCount).toBe(1);
    const retry = client.quantize(redImage(), options);
    expect(workers).toHaveLength(2);
    workers[1]!.respond();
    await expect(retry).resolves.toBeDefined();
  });

  it("maps creation and postMessage failures without exposing causes", async () => {
    const creationClient = new QuantizationWorkerClient(() => {
      throw new Error("C:\\private\\worker.js");
    });
    const creationError = await expectWorkerError(
      creationClient.quantize(redImage(), options),
      "WORKER_CREATION_FAILED",
    );
    expect(creationError.message).not.toContain("private");

    const worker = new FakeWorker();
    worker.postError = new Error("clone leaked pixels");
    const postClient = new QuantizationWorkerClient(() => worker);
    const image = redImage();
    const original = image.data.slice();
    const postError = await expectWorkerError(
      postClient.quantize(image, options),
      "WORKER_POST_MESSAGE_FAILED",
    );
    expect(postError.message).not.toContain("pixels");
    expect(worker.terminateCount).toBe(1);
    expect(image.data).toEqual(original);
  });

  it("disposes idle and active clients idempotently", async () => {
    const idleSet = fakeFactory();
    const idleClient = new QuantizationWorkerClient(idleSet.factory);
    const completed = idleClient.quantize(redImage(), options);
    idleSet.workers[0]!.respond();
    await completed;
    idleClient.dispose();
    idleClient.dispose();
    expect(idleSet.workers[0]!.terminateCount).toBe(1);
    expect(idleClient.state).toBe("disposed");
    await expectWorkerError(
      idleClient.quantize(redImage(), options),
      "CLIENT_DISPOSED",
    );

    const activeSet = fakeFactory();
    const activeClient = new QuantizationWorkerClient(activeSet.factory);
    const pending = activeClient.quantize(redImage(), options);
    activeClient.dispose();
    await expectWorkerError(pending, "CLIENT_DISPOSED");
    expect(activeSet.workers[0]!.terminateCount).toBe(1);
  });
});
