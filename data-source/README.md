# Palette Data Source Boundary

This directory is the offline input boundary for palette validation. It is not
part of the browser application and must not be imported from `src/`.

- `schema/` documents the canonical CSV and metadata envelope.
- `fixtures/` contains synthetic, explicitly non-production validation data.
- No production palette, 221/291 table, product mapping, or verified physical
  color data is present.

Validate the synthetic fixture from the repository root:

```sh
npm run palette:validate -- --csv data-source/fixtures/valid-test-palette.csv --metadata data-source/fixtures/test-palette-metadata.json
```

Production inputs may be accepted only under
[`../docs/POPAROOZ_PALETTE_IMPORT_CONTRACT.md`](../docs/POPAROOZ_PALETTE_IMPORT_CONTRACT.md).
Visual reference charts are not valid production palette sources. They must not
be OCR-imported, sampled for color values, or republished to customers.
