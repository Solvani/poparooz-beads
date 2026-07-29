# P1-A05 Color Space Conversion Review

Date: **2026-07-29**

Result: **Accepted**

## Scope reviewed

P1-A05 adds only deterministic single-color conversion from validated 8-bit sRGB through normalized sRGB, linear RGB, XYZ D65, and CIELAB D65. It includes strict runtime errors, constants, composition APIs, synthetic numeric tests, and governing documentation.

## Architecture finding

The implementation is isolated under `src/domain/color/`. It is pure TypeScript and has no dependency on React, DOM, Canvas, Blob, browser color APIs, environment variables, locale, timezone, network, persistence, palette files, Shopify logic, or random values.

Units are explicit and remain distinct:

- RGB8: integer 0 through 255;
- normalized sRGB: encoded 0 through 1;
- linear RGB: linear-light 0 through 1;
- XYZ D65: 0 through 1, with reference-white Y equal to 1;
- Lab: D65 2-degree CIELAB values.

## Numeric review

The implementation uses the project-frozen IEC sRGB inverse transfer threshold and coefficients, the fixed sRGB-to-XYZ D65 matrix, D65 2-degree white `(0.95047, 1, 1.08883)`, `epsilon = 216/24389`, and `kappa = 24389/27`. It uses `Math.cbrt`, JavaScript double precision, and no intermediate formatting or clamp.

Golden tests exercise black, white, red, green, blue, and neutral gray through the real composed formula chain with an absolute tolerance no wider than `1e-4`. Matrix and normalization tests use tighter or exact comparisons. The rounded matrix produces white `Y = 1.0000001`; this is retained and covered rather than rounded away.

## Validation and safety finding

Public entries reject missing, string, fractional, negative, out-of-range, `NaN`, and infinite values as applicable. Errors expose stable codes and safe generic messages. Inputs remain unchanged. Exact negative zero is normalized at public outputs without clearing legitimate small chromatic values.

## Test finding

Tests cover input validation, normalization, transfer-function boundary values, monotonicity, output range, all matrix rows, D65 white, both CIELAB epsilon branches, golden references, composed-versus-staged equality, exact repeatability, input immutability, negative zero, grayscale neutrality/L monotonicity, green-versus-blue lightness, and finite output across a representative RGB lattice.

Tests are numeric and assertion-based; they are not snapshot-only and contain no image or palette fixtures.

## Scope audit

The change adds no dependency and contains no Delta E, nearest palette matching, production palette import, quantization, dithering, image-buffer batch conversion, Worker, Canvas, UI, export, deployment, Shopify integration, database, AI, or OCR implementation.

## Decision

P1-A05 satisfies its isolated engineering gate and may be submitted for total-control acceptance. Work stops before P1-A06.

P1-A06 may begin only after external acceptance confirms this conversion contract and must reuse its `LabColor` and conversion functions for color distance, deterministic nearest-color selection, and tie-breaking.
