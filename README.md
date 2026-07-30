> **Poparooz Generator Source of Truth**
>
> All product scope, architecture, data contracts, implementation boundaries
> and acceptance decisions are governed by:
>
> [`docs/00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](docs/00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

# Poparooz Beads

This repository is reserved for the Poparooz fuse bead pattern generator and its related Shopify page integration.

Phase 1's browser-local computation foundation is complete and frozen. The
current page remains an engineering placeholder: there is no production palette,
workspace UI, Canvas editor, export, Shopify integration, or deployment here.

## Prerequisites

- Node.js 22 or newer
- npm 11

## Install

```sh
npm install
```

## Run the development server

```sh
npm run dev
```

## Engineering checks

```sh
npm run build
npm run typecheck
npm run lint
npm run format:check
npm run test:run
npm run benchmark
```

The benchmark uses deterministic synthetic data and writes the P1-A10 evidence
report. It is a Node computation benchmark, not real-browser acceptance.

The production build emits the quantization Worker as a separate Vite asset.
Phase 1 image processing is browser-local: it adds no upload or image
persistence path.

Validate the synthetic, non-production palette import fixture:

```sh
npm run palette:validate -- --csv data-source/fixtures/valid-test-palette.csv --metadata data-source/fixtures/test-palette-metadata.json
```

Use `npm test` for the interactive Vitest watch mode. Product decisions and
implementation boundaries remain governed by the Source of Truth and its linked
documents under [`docs/`](docs/).

Phase 2 has not started. Its first gate is presentation of 3–5 desktop/mobile UI
approaches and explicit user selection before implementation.

The repository is not ready for production sales: formal palette authorization,
physical verification, display codes, board/pack data, and real-device evidence
remain open.
