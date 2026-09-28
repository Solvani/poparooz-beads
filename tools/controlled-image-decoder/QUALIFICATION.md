# D02 deterministic decoder qualification status

Status: `R01 LOCAL PASS / Q02 REMOTE QUALIFICATION PENDING`

The remediated candidate pins Rust 1.88.0 and the accepted decoder tuple,
builds a scalar single-threaded `wasm32-unknown-unknown` module, and preserves
the closed `PoparoozControlledDecoderABI/1.0.0` facade. The operator Worker
hashes the received module with Web Crypto before instantiation and has no
browser-native image fallback.

## Artifact transition

- previous provisional WASM SHA-256:
  `99b85622115fcd7b824c0f2008b7a489d03b72dcaa989d617d28a70be4f4e921`;
- previous status: `SUPERSEDED_PROVISIONAL_ARTIFACT`;
- reason: `D02-R01 semantic remediation`;
- remediated candidate WASM SHA-256:
  `dd932592ad60b70ca0766bf9e402861e751c25194fb3386c0389dd6ecca6eeed`;
- Cargo.lock SHA-256 remains
  `bdaf0fc8c3e1c2c3b397adaa46c5c5ee268973cb5ffd62073ef13d319c5757da`;
- resize implementation digest remains
  `a75e1efdec46c8f2325909943977fef21e14e07acd7d205e334f7cc105896884`.

The superseded artifact is retained as historical evidence only. It is not
described as defective beyond the proven four-component JPEG and invalid PNG
iCCP fail-open cases.

## R01 semantic policy

JPEG bytes are structurally scanned before backend decode. The first
applicable SOF must be well framed and declare exactly one or three components.
Four-component CMYK/YCCK and every other component count fail with
`UNSUPPORTED_CODEC_FEATURE` before pixel decode.

PNG bytes are scanned before backend decode and raw iCCP declaration is tracked.
A declared iCCP that does not yield a backend ICC profile, or yields a profile
that cannot be parsed, fails with `INVALID_ICC_PROFILE`. A parseable profile
whose ICC device class is outside scanner, monitor, or printer fails with
`UNSUPPORTED_COLOR_PROFILE`.

The qualification fixtures exercise the following deterministic precedence:

1. source byte limit;
2. codec signature and container structure;
3. encoded dimensions, frame count, and structural feature gates;
4. codec-specific unsupported source features;
5. declared metadata presence and structural validity;
6. metadata size limits;
7. ICC and EXIF policy validation;
8. pixel decode;
9. decoded buffer and dimension authority checks.

## Corpus and harness

The committed corpus contains 54 stable synthetic fixtures with source SHA-256,
expected disposition, and positive pixel authority. It was generated in the
isolated qualification package with Sharp 0.35.5 / libvips 8.18.7; the rejected
Sharp 0.34.4 candidate remains explicitly recorded. Sharp is not a root/runtime
dependency.

The Node native-WASM harness verifies artifact and Cargo.lock digests, confirms
that the WASM imports no host memory, executes every fixture, and emits the
golden manifest. The browser harness uses the real dedicated Worker client,
the packaged WASM, Web Crypto artifact verification, and the same committed
fixtures. The aggregate gate compares source SHA, codec, normalized dimensions,
orientation, ICC disposition, RGBA byte length, and decoded pixel SHA-256 across
Linux native WASM, Windows Chromium, Linux Chromium, and Linux Firefox.

## Local evidence

- Rust unit tests: 16 passed;
- Rust clippy with warnings denied: passed;
- complete native corpus: 54 / 54 passed;
- Windows Chromium 154 Worker corpus: 54 / 54 passed;
- artifact digest mismatch: `ARTIFACT_DIGEST_MISMATCH`;
- Worker timeout: `DECODE_TIMEOUT` with Worker termination;
- Worker trap: `DECODE_TRAP` for pending requests;
- JPEG CMYK and YCCK-style: `UNSUPPORTED_CODEC_FEATURE`;
- invalid and parse-invalid PNG iCCP: `INVALID_ICC_PROFILE`;
- parseable unsupported ICC class: `UNSUPPORTED_COLOR_PROFILE`;
- WebP alpha decoded pixel SHA-256:
  `543745df1377b9d83d9e58c3242dac285b7ed469c773935b50b0f973fb5eb4a5`.

## Remaining gate

The dedicated feature-branch workflow must still prove Linux native WASM,
Windows Chromium, Linux Chromium, Linux Firefox, and aggregate exact equality
against the same candidate SHA. Until that run passes, this is not final runtime
authority and D03 remains unauthorized.
