> **Poparooz Generator Source of Truth**
>
> All product scope, architecture, data contracts, implementation boundaries
> and acceptance decisions are governed by:
>
> [`docs/00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](docs/00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

# Poparooz Beads

This repository is reserved for the Poparooz fuse bead pattern generator and its related Shopify page integration.

The repository now contains the Phase 1 frontend engineering baseline. It does
not yet contain the production pattern generator, color engine, or workspace UI.

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
```

Use `npm test` for the interactive Vitest watch mode. Product decisions and
implementation boundaries remain governed by the Source of Truth and its linked
documents under [`docs/`](docs/).
