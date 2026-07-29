# P1-A03 Palette Import Validation Review

Review date: **2026-07-29**

Result: **Accepted with follow-up**

## Scope delivered

P1-A03 adds a canonical offline CSV and metadata envelope, standard CSV parsing,
typed conversions, row/column-aware aggregated errors, final Domain validation,
synthetic fixtures, a Windows-compatible CLI, tests, and contract updates.

The Import Tool is under `scripts/palette/`; it owns files and text conversion.
The existing `src/domain/palette/` remains the only business-rule authority and
still has no React, DOM, network, filesystem, CLI, or environment dependency.

## Parser decision

`csv-parse` is a focused, mature parser with native TypeScript declarations and
no transitive runtime dependencies. It correctly handles BOM, line endings,
quotes, commas, and record information. It is a devDependency because the
import tool is offline engineering tooling. The CLI runs through the repository's
Node 22+ baseline and native TypeScript type stripping, adding no script runner.

## Input and safety boundary

The canonical 24-column header is case-sensitive, order-independent, complete,
and closed to unknown/duplicate columns. Metadata is separate and strict;
`colorCount` is computed. No input file is modified and no production runtime
artifact is generated.

Errors distinguish syntax, headers, conversion, Domain, metadata, internal-code
duplicates, and display-code duplicates. They use actual file rows and columns,
aggregate multiple failures, and do not echo complete input records.

## Fixture evidence

The three-color valid fixture covers normal automatic matching, unsellable/no
automatic matching, and a special finish/no automatic matching. All fixtures
are named test/invalid, use synthetic `TEST-REF-*` and `POP-TEST-*` values, keep
internal/public identities different, and contain no real commerce mapping or
verified claim. They live outside the frontend source tree.

## Explicit exclusions

No real 221/291 palette, OCR, chart sampling, Excel parser, network scraper,
RGB-to-Lab conversion, distance, quantization, image decode/upload, Worker,
Canvas, UI, customer export, Shopify integration, deployment, production
display code, or runtime palette artifact was added.

The visual chart mentioned in project discussion remains an unverified visual
reference and was not accessed or processed.

## Follow-up

- Obtain an authorized structured supplier source and license evidence before
  importing production values.
- Approve a production Poparooz display-code/name set separately.
- Keep `sourceType` below `verified` until physical verification is documented.
- Resolve Node/npm PATH and the missing `origin/main` tracking target/Git HTTPS
  helper before routine install and push workflows.

## P1-A04 entry condition

P1-A04 may begin only after this commit is separately accepted. It must be
limited to image input/decode, orientation, transparency, fit, and scaling with
synthetic fixtures; it must not pull forward color conversion, distance,
quantization, Worker, Canvas, full UI, export, Shopify, or deployment work.
