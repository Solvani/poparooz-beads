# Poparooz Color Space Conversion Contract

Status: **P1-A05 implemented contract**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Implementation: [`../src/domain/color/`](../src/domain/color/)

## Scope

P1-A05 provides a deterministic, brand-independent, single-color conversion chain:

```text
8-bit sRGB
-> normalized encoded sRGB
-> linear-light RGB
-> XYZ D65
-> CIELAB D65
```

It provides no color distance, nearest-color matching, palette access, quantization, dithering, image-buffer conversion, Worker, Canvas, browser API, UI, export, Shopify, network, persistence, or random behavior.

## Types and units

- `Rgb8`: integer `r`, `g`, and `b` channels in 0 through 255.
- `SrgbNormalized`: encoded, not-yet-linearized `r`, `g`, and `b` channels in 0 through 1.
- `LinearRgb`: linear-light `r`, `g`, and `b` channels in 0 through 1.
- `XyzD65`: `x`, `y`, and `z` on the 0 through 1 scale, where reference-white `Y` is 1. It never uses the 0 through 100 XYZ scale.
- `LabColor`: CIELAB `l`, `a`, and `b`; nominal in-gamut sRGB produces `L*` near 0 through 100. The implementation does not impose artificial bounds on `a*` or `b*`.

TypeScript structure alone is not a runtime range guarantee. Every public conversion entry validates its input. Inputs are not clamped, rounded, coerced from strings, or mutated.

## Runtime validation and errors

`Rgb8` channels must be numbers, finite integers, and within 0 through 255. Normalized sRGB and linear RGB channels must be finite numbers in 0 through 1. XYZ channels must be finite and non-negative.

Invalid values throw `ColorConversionError` with a stable code:

- `INVALID_RGB_CHANNEL`
- `RGB_CHANNEL_OUT_OF_RANGE`
- `INVALID_NORMALIZED_CHANNEL`
- `INVALID_LINEAR_RGB`
- `INVALID_XYZ`
- `NON_FINITE_COLOR_VALUE`

Messages contain no image, pixel buffer, file information, palette data, supplier identity, commerce identifier, or other user data. Raw `TypeError` and `RangeError` objects are not the public error contract.

## sRGB normalization and inverse transfer

`rgb8ToNormalizedSrgb` divides each validated 8-bit channel by 255 without intermediate rounding.

For an encoded normalized channel `c`:

```text
cLinear = c / 12.92                         when c <= 0.04045
cLinear = ((c + 0.055) / 1.055) ^ 2.4      otherwise
```

The branch threshold is exactly `0.04045`. Gamma 2.2 is not used as an approximation. The conversion direction is encoded sRGB to linear light.

## Linear RGB to XYZ D65

The runtime-frozen matrix is:

```text
X = 0.4124564 R + 0.3575761 G + 0.1804375 B
Y = 0.2126729 R + 0.7151522 G + 0.0721750 B
Z = 0.0193339 R + 0.1191920 G + 0.9503041 B
```

`R`, `G`, and `B` are linear values on the 0 through 1 scale. XYZ output uses the same 0 through 1 luminance scale. The matrix is the project-frozen sRGB/D65 matrix based on the IEC 61966-2-1 sRGB primaries and D65 reference conditions. P1-A05 performs no gamut compression and no chromatic adaptation because both the source sRGB space and destination XYZ/Lab contract use D65.

The rounded matrix coefficients sum to `(0.95047, 1.0000001, 1.08883)` for linear white. The tiny `Y` excess is retained rather than hidden by intermediate rounding.

## XYZ D65 to CIELAB D65

The frozen CIE D65 2-degree reference white on the 0 through 1 XYZ scale is:

```text
Xn = 0.95047
Yn = 1.00000
Zn = 1.08883
```

The constants and transform are:

```text
epsilon = 216 / 24389
kappa   = 24389 / 27

xr = X / Xn
yr = Y / Yn
zr = Z / Zn

f(t) = cbrt(t)                         when t > epsilon
f(t) = (kappa * t + 16) / 116          otherwise

L* = 116 * f(yr) - 16
a* = 500 * (f(xr) - f(yr))
b* = 200 * (f(yr) - f(zr))
```

The implementation uses `Math.cbrt`. It does not add D50 support, Bradford adaptation, alternate white points, channel clipping, or broad epsilon-based zeroing.

## Composition API

The stable entry points are:

- `rgb8ToNormalizedSrgb`
- `srgbChannelToLinear`
- `normalizedSrgbToLinearRgb`
- `rgb8ToLinearRgb`
- `linearRgbToXyzD65`
- `xyzD65ToLab`
- `rgb8ToXyzD65`
- `rgb8ToLab`

`rgb8ToXyzD65` and `rgb8ToLab` compose the same exported primitive functions. They do not contain duplicate formulas.

## Precision and determinism

- All computation uses JavaScript double-precision `number` values.
- No intermediate or returned number is passed through `toFixed`, string formatting, integer rounding, or display precision.
- Public APIs return full numeric results.
- Tests use tolerances selected for their purpose: exact equality for normalization and matrix coefficient checks, strict floating-point proximity for branches, and at most `1e-4` absolute error for rounded golden Lab references.
- The only output canonicalization changes exact negative zero (`-0`) to positive zero (`0`). Small legitimate nonzero `a*` or `b*` values remain intact.
- No locale, timezone, browser API, environment variable, or random source participates in conversion.

## Golden references

The following rounded reference values are derived through the full frozen formula chain above. They are conventional D65 sRGB/CIELAB examples based on IEC 61966-2-1 sRGB transfer/primaries and the CIE 15 D65 2-degree white-point/Lab definition. Production functions do not special-case these colors.

| RGB8              | Expected Lab D65                              |
| ----------------- | --------------------------------------------- |
| `(0, 0, 0)`       | approximately `(0, 0, 0)`                     |
| `(255, 255, 255)` | approximately `(100, 0, 0)`                   |
| `(255, 0, 0)`     | approximately `(53.2408, 80.0925, 67.2032)`   |
| `(0, 255, 0)`     | approximately `(87.7347, -86.1827, 83.1793)`  |
| `(0, 0, 255)`     | approximately `(32.2970, 79.1875, -107.8602)` |
| `(128, 128, 128)` | approximately `(53.5850, 0, 0)`               |

Small near-zero `a*` and `b*` values for neutral colors are expected from the rounded matrix/white constants and are not erased.

## Alpha and image boundary

Alpha is not part of sRGB, XYZ, or Lab conversion. P1-A04 owns RGBA normalization, transparency, and white-background composition. A fully transparent RGBA pixel must not be passed to this module as black and included in later matching. A later pattern pipeline must decide whether a pixel is an empty bead position before converting its opaque RGB color.

P1-A05 intentionally provides no RGBA batch helper and does not change P1-A04 behavior.

## Brand and data boundary

The formulas, types, errors, tests, and public API are independent of any palette, supplier, product, Shopify mapping, display code, or customer brand. No production palette is loaded or embedded. Future Poparooz palette matching must consume these conversion functions without adding third-party identity to the color-math layer.

## P1-A06 reuse boundary

P1-A06 may consume `LabColor` and `rgb8ToLab` to implement separately reviewed color-distance and deterministic nearest-color rules. It must not duplicate or silently alter this conversion chain. P1-A06 remains outside this contract and may begin only after P1-A05 acceptance.

## P1-A10 freeze note

The conversion implementation is unchanged and frozen for Phase 1. Deterministic Node timings for 8–256 synthetic unique colors are recorded in the P1-A10 performance evidence; they are measurements, not an SLA or browser claim.
