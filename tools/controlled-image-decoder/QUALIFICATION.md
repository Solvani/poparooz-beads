# D02 deterministic decoder qualification status

Status: `CANDIDATE / NOT FINAL RUNTIME AUTHORITY`

The candidate pins Rust 1.88.0 and the accepted decoder tuple, builds a scalar
`wasm32-unknown-unknown` module, and exposes only the closed
`PoparoozControlledDecoderABI/1.0.0` facade. The operator Worker hashes the
received module with Web Crypto before instantiation and has no browser-native
image fallback.

Locally verified gates:

- byte-signature dispatch for JPEG, PNG, and WebP;
- APNG and animated WebP fail closed before pixel decode;
- duplicate EXIF, CMYK, 16-bit PNG, unsupported PNG color metadata, and limit
  breaches fail closed;
- EXIF orientations 1 through 8 produce exact expected RGBA byte layouts;
- PNG straight-alpha sentinels 0, 1, 127, 128, 254, and 255 survive exactly;
- existing contain/resize behavior is wrapped without changing customer code;
- operator-only CSP permits `wasm-unsafe-eval`; the customer CSP is unchanged.
- Windows Chromium 154 executed the dedicated Worker against the packaged WASM,
  matched the local source and decoded-pixel SHA-256 values byte-for-byte, and
  reported a 31.6 ms cold initialization plus a 3.9 ms decode in that observed
  run;
- the local Node harness confirmed imported shared memory is not used, the WASM
  digest is
  `99b85622115fcd7b824c0f2008b7a489d03b72dcaa989d617d28a70be4f4e921`,
  and the decoded-pixel digest is
  `0c56f8050291bf8f183eb4e9353e3ea19754af4c396ef7cc699dfa58fa82f163`;
- `cargo audit` found zero known vulnerabilities in the 44-package locked
  dependency closure; the generated SBOM contains 43 external packages and a
  copied license directory for each package (technical inventory, not legal
  advice).

Open qualification gates:

- the complete D02 JPEG/PNG/WebP golden corpus, including ICC source profiles,
  progressive/Adam7/truncation and boundary fixtures, is not complete;
- Linux Chromium, Linux native WASM, and Firefox have not produced
  same-source/same-WASM exact output digests; Windows Chromium alone is not a
  cross-platform qualification;
- browser crash, trap, timeout, and memory-bound measurements are not complete;
- representative per-codec performance and peak-memory evidence is incomplete.

Therefore this candidate must return
`STOP — V3-D02 CROSS-PLATFORM QUALIFICATION INCOMPLETE`. It is reviewable source
and artifact evidence only; it is not permission to start D03 or create V3
business records.
