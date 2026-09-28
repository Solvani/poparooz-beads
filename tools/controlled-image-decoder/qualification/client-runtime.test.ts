import { afterEach, describe, expect, it, vi } from "vitest";

import { ControlledDecoderWorkerClient } from "../../../src/operator/controlled-generation/decoder/client";

class SilentWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly postMessage = vi.fn();
  readonly terminate = vi.fn();
}

describe("ControlledDecoderWorkerClient failure containment", () => {
  afterEach(() => vi.useRealTimers());

  it("terminates the isolated worker and reports a bounded timeout", async () => {
    vi.useFakeTimers();
    const worker = new SilentWorker();
    const client = new ControlledDecoderWorkerClient(
      worker as unknown as Worker,
    );

    const pending = client.decode(new Uint8Array([0xff, 0xd8, 0xff]), "JPEG");
    const assertion = expect(pending).rejects.toMatchObject({
      code: "DECODE_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("fails every pending request closed when the worker traps", async () => {
    const worker = new SilentWorker();
    const client = new ControlledDecoderWorkerClient(
      worker as unknown as Worker,
    );

    const pending = client.decode(new Uint8Array([0xff, 0xd8, 0xff]), "JPEG");
    worker.onerror?.(new ErrorEvent("error"));

    await expect(pending).rejects.toMatchObject({ code: "DECODE_TRAP" });
  });
});
