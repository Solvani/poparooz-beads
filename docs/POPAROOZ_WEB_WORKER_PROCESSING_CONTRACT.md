# Poparooz Web Worker Processing Contract

Status: **P1-A08 implemented contract**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Quantization authority: [`POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md`](POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md)

Implementation: [`../src/workers/`](../src/workers/) and [`../src/lib/quantization-worker/`](../src/lib/quantization-worker/)

## Scope and architecture

P1-A08 executes one accepted P1-A07 whole-image quantization task in a native Vite module Worker. The Domain remains pure and independent of Worker globals, messages, React, DOM, Vite, AbortSignal, URL, network, and storage. The Worker Runtime validates unknown protocol data, reconstructs RGBA, invokes the existing `quantizeImage`, and serializes a safe response. The Worker Entry only connects `self.onmessage` to that Runtime. The main-thread Client owns request lifecycle and never imports or calls the quantizer, Histogram, Median Cut, Medoid selection, palette matching, Canvas, network, or persistence.

The production factory is lazy and uses:

```ts
new Worker(new URL("../../workers/quantization.worker.ts", import.meta.url), {
  type: "module",
  name: "poparooz-quantization-worker",
});
```

There is no Blob/eval/CDN Worker and no synchronous main-thread fallback. An unavailable Worker is a stable error.

## Protocol version and messages

Every request and response has `protocolVersion: 1` and a positive safe-integer `requestId`. IDs increase monotonically within one Client and are not random, time-, locale-, file-, or identity-derived.

`QUANTIZE_IMAGE` contains only `width`, `height`, copied `rgbaBuffer`, `maxColors`, and `alphaThreshold`. It contains no file, path, MIME, Blob, palette, brand, UI, product, or commerce data.

`QUANTIZATION_SUCCEEDED` contains dimensions, structured-cloned color metadata, transferred `colorIndicesBuffer`, transparent sentinel, and opaque/transparent counts. `QUANTIZATION_FAILED` contains only a safe `code` and `message`. Known `QuantizationError` codes cross the Runtime boundary; unknown exceptions become `QUANTIZATION_FAILED` / `Image quantization failed.` without their message, object, cause, or stack.

Requests and responses are validated from `unknown`. Protocol objects, payload/result/error objects, and nested color objects use exact own-field allowlists. Unknown types, versions, fields, inherited substitutes, invalid IDs, non-ArrayBuffer values, SharedArrayBuffer, inconsistent lengths, malformed colors/counts, and invalid P1-A07 results are rejected.

When an invalid Runtime request has no readable safe request ID, the Runtime uses diagnostic request ID `1` in its safe failure response. This keeps the Worker Entry alive; no active Client can mistake that response for success because current request ID and generation checks still apply.

## Transferable ownership

The Client creates `new Uint8ClampedArray(image.data)` before posting. This copies exactly the caller's visible typed-array view, including a view with nonzero `byteOffset`. Only that new buffer appears in the input Transfer List. The caller's original buffer is never transferred or detached and remains usable after success, abort, supersede, domain failure, post failure, or retry.

The Runtime creates a separate `Uint16Array` through P1-A07. A success Transfer List contains exactly its `colorIndicesBuffer`. The Client reconstructs `Uint16Array` directly on that buffer, makes no additional index-array copy, and reuses the exported P1-A07 invariant validator. Input and output buffers differ, and output buffers from consecutive tasks are independent.

## Cancellation, supersede, and stale results

P1-A07 is synchronous CPU work. Cancellation therefore uses `worker.terminate()`; no misleading `CANCEL` message, progress event, queue polling, SharedArrayBuffer, Atomics, cooperative yield, Worker pool, or partial result exists.

- A pre-aborted signal rejects with `ABORTED` before input validation/copy, Worker creation, or posting.
- Abort during processing removes its listener, rejects with `ABORTED`, terminates exactly that Worker, invalidates its generation, and lets the next call create a fresh Worker.
- Abort after completion has no effect because the listener and active references are gone.
- A new call supersedes the active call with `SUPERSEDED`, terminates the old Worker, advances generation, and starts only the newest task on a fresh Worker.

Both monotonically increasing `requestId` and Worker `generation` protect the active job. Mismatched request IDs and callbacks captured from an older generation are ignored. They cannot resolve, reject, overwrite, or otherwise mutate the current task. A malformed message attributable to the current Worker and request terminates that Worker with a protocol error.

## Lifecycle and errors

The Client has `idle`, `processing`, and `disposed` states. It creates on first use, may reuse a healthy successful or domain-failing Worker while idle, and discards a Worker after abort, supersede, crash, message decode error, synchronous post failure, or invalid protocol/result. `dispose()` rejects an active job with `CLIENT_DISPOSED`, terminates an idle or active Worker once, is idempotent, and permanently rejects future calls. Completed jobs retain no resolver, input/result buffer, or AbortSignal listener.

Stable Client codes are:

```text
WORKER_UNAVAILABLE
WORKER_CREATION_FAILED
WORKER_POST_MESSAGE_FAILED
WORKER_CRASHED
WORKER_MESSAGE_ERROR
WORKER_PROTOCOL_ERROR
WORKER_PROCESSING_FAILED
INVALID_WORKER_RESULT
ABORTED
SUPERSEDED
CLIENT_DISPOSED
```

A safe Worker/domain code may be retained as `causeCode`. Raw browser errors, abort reasons, stacks, pixels, files, paths, images, palette data, internal supplier identity, and commerce identifiers never enter Client errors.

## Privacy, performance, and deferred validation

Worker and Client code has no fetch, XHR, WebSocket, sendBeacon, storage, analytics, pixel logging, file metadata, formal palette, customer-facing copy, or third-party branding. No formal progress percentage is emitted. Existing P1-A04 size guards remain provisional; P1-A08 adds no new arbitrary limit or timing gate.

Vitest uses only tiny generated RGBA data and an injected Fake Worker to verify protocol, Runtime, transfer lists, byte-offset copies, hard cancellation, supersede, stale callbacks, error events, rebuilding, disposal, and output invariants. Vite must emit a separate `quantization.worker-*.js` asset; `dist` is never committed.

Real Chrome, Firefox, Safari, Chrome Android, and Safari iOS remain P1-A10/P1-A11 follow-up for module loading, actual buffer detachment, termination, rapid settings changes, large-image cancellation, memory reclamation, and representative-device performance. P1-A08 does not implement palette mapping, pattern matrices, material/board totals, Canvas/UI, export, Shopify, or deployment. Those boundaries remain closed before P1-A09 acceptance.
