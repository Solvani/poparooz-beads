# P1-A08 Web Worker Processing Review

Date: **2026-07-30**

Result: **Accepted with follow-up**

## Scope reviewed

P1-A08 adds protocol v1, a pure testable Worker Runtime, a minimal native module Worker Entry, an injectable lazy Client/factory, Transferable ownership, hard cancellation, last-request-wins supersede, request/generation stale rejection, lifecycle cleanup, synthetic tests, and governing documentation.

## Architecture and main-thread finding

The synchronous P1-A07 quantizer remains under Domain and has no Worker dependency. Only the Runtime imports it. The Client imports input/options/result validators but not `quantizeImage`, Histogram, Median Cut, cluster/Medoid code, palette matching, Canvas, React, network, or storage. No synchronous main-thread fallback exists. The factory uses a static Vite `new URL`, `{ type: "module" }`, and a stable Worker name without eager construction, Blob, eval, CDN, Comlink, pool, or SharedArrayBuffer.

## Protocol and ownership finding

Both directions use version 1 and positive monotonic request IDs. Runtime validators reject unknown fields and malformed/prototype-derived data. Input posting transfers an exact copy of the caller's typed-array view, never the caller buffer. Successful Runtime output transfers the exact P1-A07 `colorIndicesBuffer`; the Client reconstructs directly and invokes the shared P1-A07 invariant validator. Tests prove input/output and consecutive outputs do not share ownership.

## Cancellation, stale-result, and lifecycle finding

Pre-abort creates no Worker. Active abort and supersede reject predictably, remove listeners, terminate once, invalidate generation, and rebuild on demand. Request ID rejects current-generation stale messages; generation rejects callbacks captured from terminated Workers. Healthy success/domain-failure can reuse an idle Worker. Crash, message error, post failure, invalid protocol/result, and dispose clean active references and terminate. Dispose is permanent and idempotent.

## Error, privacy, and brand finding

Client errors use the eleven frozen safe categories; known Domain failure codes remain bounded `causeCode`. Runtime unknown exceptions are replaced with a fixed generic failure. No raw stack, cause, abort reason, pixels, file/path, palette, commerce ID, internal reference branding, or third-party branding appears in messages or customer-capable errors. Static scans found no network, persistence, Canvas, UI, formal-palette, Worker-pool, Atomics, or main-thread quantizer behavior in the Worker/Client implementation.

## Test and build finding

Automated tests use only generated 1x1/2x2 RGBA values and Fake Workers. They cover strict protocol validation, Runtime success/failure transfer lists, byte-offset input ownership, direct output reconstruction, abort before/during/after, supersede, stale request/generation callbacks, creation/post/crash/message errors, invalid responses/results, reuse/rebuild, and disposal. The production Vite build emits a distinct `quantization.worker-*.js` asset; the app bundle does not execute the Runtime and `dist` remains ignored/uncommitted.

## Follow-up and decision

Real module loading, true detached-buffer behavior, termination timing, large-image cancellation, rapid setting changes, memory reclamation, and performance still require Chrome/Firefox/Safari, Android/iOS, and representative-device evidence during P1-A10/P1-A11. Neither an offline nor current online npm audit was obtained: `npm` remains absent from PATH and the available bundled Node runtime contains no npm CLI. No dependencies changed; the failed offline attempt and online follow-up are recorded honestly rather than bypassed.

P1-A08 satisfies its isolated engineering gate and is accepted with those follow-ups. P1-A09 may begin only after total-control acceptance and must add palette mapping/pattern/material behavior without weakening this Worker or public-brand boundary. Work stops before P1-A09.
