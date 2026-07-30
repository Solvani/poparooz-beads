# Poparooz Phase 1 Completion and Freeze

## 1. Phase 1 objective

Phase 1 establishes the browser-local computation foundation for image-to-pattern generation. It freezes contracts and deterministic domain behavior; it is not a production product release.

## 2. Completed modules

Engineering baseline, palette contracts, public-branding isolation, palette import validation, image normalization, RGB/XYZ/Lab conversion, CIEDE2000 matching, deterministic quantization, cancellable Worker pipeline, Pattern Assembly, material counts, and Board Layout are complete.

## 3. Authoritative data chain

```text
Image
-> Normalized RGBA
-> QuantizedImage
-> Palette Mapping
-> Pattern Matrix
-> Materials
-> Board Layout
-> Public Pattern
```

## 4. Frozen core rules

- Images are processed locally; contain sizing defaults to no upscale, alpha handling is explicit, and no default dithering is added.
- CIEDE2000 matches only active, sellable, auto-match-enabled colors; identical final colors merge without adding reserve or waste.
- Board counts cover the full matrix. Public output is an explicit Poparooz-only allowlist.
- Worker jobs support abort/supersede and stale-result rejection.
- No production release is permitted before formal palette, authorization, display code, physical board, and commerce inputs are verified.

## 5. Tests and checks

Final regression: 25 test files and 475 tests passed. Build, all three TypeScript configurations, ESLint, Prettier check, `git diff --check`, and reproducible benchmark passed. Vite emitted a separate quantization Worker asset. No warning was reported by the final gates.

## 6. Performance conclusion

Overall classification: **Yellow**. Desktop Node pure-computation medians were Small 3.08 ms, Medium 9.08 ms, Large 32.52 ms, and Stress 126.71 ms. Palette Matching dominates Large/Stress and Pattern Assembly includes that matching cost. Worker Decision: **C — keep Pattern Assembly synchronous temporarily, with limits, until representative browser/device evidence exists**. Protocol version 1 remains unchanged.

Evidence: [`evidence/P1_A10_PERFORMANCE_BENCHMARK.md`](evidence/P1_A10_PERFORMANCE_BENCHMARK.md). Node heap deltas are approximate and are not browser peak-memory or leak proof.

## 7. Browser-validation status

Chrome, Firefox, Safari, Chrome Android, and Safari iOS are all **Not executed**. The matrix is prepared at [`evidence/P1_A10_BROWSER_VALIDATION_MATRIX.md`](evidence/P1_A10_BROWSER_VALIDATION_MATRIX.md). Chrome was discoverable locally, but the placeholder app does not expose the full chain and no credible interactive evidence was produced. Firefox was unavailable; Safari/iOS are unavailable on Windows; no real mobile device was connected.

## 8. Open dependencies

Formal palette and usage authorization; physical-color verification; approved Poparooz display codes/names; verified BoardProfile; pack size; Shopify mapping; representative real devices; a latest online dependency audit; and Git remote/push restoration remain open. Details are in the [final audit](reviews/P1_A10_PHASE_1_FINAL_AUDIT.md) and [license inventory](audits/P1_PHASE_1_DEPENDENCY_AND_LICENSE_AUDIT.md).

## 9. Phase 2 entry conditions

Phase 2 may begin with UI prototyping and the MVP workspace after the user selects one of 3–5 proposed desktop/mobile approaches. Production-data integration remains blocked by the open dependencies above. Before exposing representative Large or broader palette/image combinations, measure the complete interaction on target devices; user-visible blocking triggers a separate Worker-protocol design task.

## 10. No-regression boundary

Future UI must not duplicate algorithms, expose internal `PaletteColor`, bypass Worker lifecycle rules, or treat visual swatches as production data. No customer-visible path may expose the internal reference brand. Phase 2 has not started and no UI style has been selected.
