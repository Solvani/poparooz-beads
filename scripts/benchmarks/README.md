# P1-A10 Pure Computation Benchmark

Run from the repository root:

```text
npm run benchmark
```

When npm is unavailable but the bundled Node executable is known, invoke that Node executable with `scripts/benchmarks/run-benchmark.mjs --write`.

The runner uses the existing Vite installation to create a temporary SSR bundle outside the repository, executes it in Node, writes the sanitized Markdown evidence file, and removes the temporary bundle. No benchmark code, fixture, or report generator enters the frontend production graph.

The benchmark uses three warm-ups and ten retained measurements per scenario. It reports min, median, nearest-rank p95, max, approximate Node heap observations, and explicit input/output buffer sizes. Fixtures are deterministic, generated in memory, and unmistakably synthetic/not-production.

This is not browser E2E timing. It excludes actual JPEG/PNG/WebP decoding, Canvas, Worker scheduling, transferable detachment, rendering, and user interaction. It contains no fixed pass/fail timing threshold and must not be presented as a mobile SLA or Safari memory result.
