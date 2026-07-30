> **Poparooz Generator Source of Truth**
>
> All product scope, architecture, data contracts, implementation boundaries
> and acceptance decisions are governed by:
>
> [`docs/00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](docs/00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

# Poparooz Beads

Poparooz Beads is the browser-first Poparooz fuse-bead pattern generator. Phase 2 provides the responsive customer journey from local image selection through pattern settings, generation lifecycle, Canvas inspection, results, and placeholder actions.

Phase 2 UI implementation is completed and frozen. Its code validation passed with external device gates open; production launch readiness remains blocked.

## Prerequisites

- Node.js 22 or newer
- npm 11

## Install and run

```sh
npm install
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

The benchmark uses deterministic synthetic data and writes the P1-A10 evidence report. It is a Node computation benchmark, not real-browser acceptance. The production build emits the quantization Worker as a separate Vite asset.

Validate the synthetic, non-production palette import fixture:

```sh
npm run palette:validate -- --csv data-source/fixtures/valid-test-palette.csv --metadata data-source/fixtures/test-palette-metadata.json
```

Use `npm test` for interactive Vitest watch mode. Product decisions and implementation boundaries remain governed by the Source of Truth and its linked documents under [`docs/`](docs/).

## Browser-local privacy

Selected images and all currently available processing stay inside the browser. The application does not upload or remotely persist customer images.

## Current Phase 2 experience

- Responsive desktop, tablet, and mobile workspace shell
- Local image upload, validation, replacement, and removal
- Pattern settings and a cancellable generation lifecycle with stale-result protection
- Canvas viewport controls and responsive pattern rendering
- Results, material summary, board-layout information, and a mobile bottom sheet
- Disabled `Download Pattern` and `Get Beads` placeholders for intentionally unavailable capabilities
- Keyboard, focus, reduced-motion, contrast, and browser-behavior hardening covered by the P2-I09 evidence

The customer-facing contract exposes only `PublicPatternResult`. Internal supplier and reference fields remain behind the Phase 1 boundary and are not rendered, exported, or included in customer-visible errors.

## Validation status

- Phase 2 UI Implementation: Completed and Frozen
- Phase 2 Code Validation: Passed with external device gates open
- Production Launch Readiness: Blocked
- Production Generation Runtime: Unavailable
- Automated suite at freeze: 64 test files, 676 tests passed

See [Phase 2 completion and freeze](docs/POPAROOZ_PHASE_2_COMPLETION_AND_FREEZE.md) and the [P2-I10 final audit](docs/reviews/P2_I10_PHASE_2_FINAL_AUDIT.md) for complete evidence and remaining gates.

The repository is not ready for production sales. The official production Poparooz palette/runtime is unavailable, customer downloads and Shopify commerce are not implemented, and named external device/browser validation gates remain open.
