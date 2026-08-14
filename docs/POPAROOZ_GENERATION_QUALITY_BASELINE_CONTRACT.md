# Poparooz Generation Quality Baseline Contract

Contract stage: P3-A03-Q01-A01 Generator Quality Harness Foundation

Status: implementation pending review; no authoritative production baseline is frozen.

## Purpose

The generator-quality harness evaluates preprocessing candidates against a
versioned corpus instead of approving production changes from one image. It is
Node-only evidence tooling and does not enter the browser production module
graph.

The harness reports independent background-removal, Pattern-structure, color,
and performance evidence. It never creates one weighted overall quality score.

## Frozen Production Boundary

The harness may import existing pure production primitives. It must not alter:

- image-processing production semantics;
- Matcher or CIEDE2000;
- Quantizer or Worker protocol;
- ProcessingPolicy or occupancy thresholds;
- Runtime Palette, Color Set, BoardProfile, or their Locks;
- Pattern, Download, Highlight, Shopify, or Cloudflare behavior; or
- the frozen E05-D01 evaluator.

H03-A02 and E05-D02 remain outside this stage.

## Corpus Manifest

The versioned manifest contains logical identities and evidence metadata, not
customer pixels or local absolute paths. Each case records:

- schema and corpus versions;
- case ID, primary category, and controlled tags;
- source kind and logical input ID;
- input SHA-256, optional dimensions, and alpha classification;
- reference type and optional trusted paired input;
- supported Background modes and Pattern sizes;
- protected component, thin-feature, or endpoint declarations; and
- authorization and storage classification.

Duplicate case IDs and logical input IDs fail closed. Synthetic cases use
programmatic fixtures and synthetic masks. Curated inputs remain external by
default.

## External Corpus Privacy

External curated inputs resolve under the Node-only
`POPAROOZ_QUALITY_CORPUS_DIR` root. The resolver rejects path traversal,
missing files, mismatched hashes, unsupported entry types, and undeclared extra
files. It performs no network operation and does not persist image pixels into
reports.

No customer or user image may be committed without explicit per-file approval.
Reports must not contain absolute paths, local usernames, source filenames,
image pixels, or thumbnails.

## Synthetic Development Corpus

The development manifest is `0.1.0` and is explicitly non-authoritative. Its
programmatic fixtures cover opaque white backgrounds, pale subjects, edge
contact, binary and partial alpha, thin lines/endpoints, antialiasing, soft
edges, gradients, saturation, low contrast, disconnected light regions,
neutral fringe, tinted matte, dark scenes, and flat graphics.

The exact H03 Logo pair is not committed. A later complete manifest may
register it as one external opaque/trusted-alpha paired case by logical IDs and
SHA-256 values.

## Production Replay

Synthetic replay composes the same production primitives in the same order:

```text
source RGBA
-> strict source ownership handling
-> opaque matte refinement when eligible
-> deterministic contain normalization and resize
-> existing post-resize H02 cleanup
-> frozen transparent occupancy
-> unchanged Quantizer
-> frozen E05 six-profile evaluator
-> approved 221-profile projection
-> Pattern assembly and public mapping
```

The harness supports 40, 60, 80, and 104 Pattern sizes and both White and
Transparent paths. Browser file decoding for the curated corpus belongs to the
later Q01-A02 intake stage; A01 does not introduce a Node image decoder or a new
dependency.

## Metrics

Background and structure metrics include TP, false-background occupied cells,
lost-subject cells, occupancy disagreement, candidate/reference-only cells,
bounding boxes and IoU, connected components, split/merge/deletion,
singletons/small islands, endpoint retention, thin-feature continuity, bead
delta, and normalized alpha difference.

Color evidence reuses E05-D01 and keeps the six profile outputs separate:

```text
24 / 48 / 72 / 120 / 168 / 221
```

Each profile reports weighted mean, weighted p95, maximum DeltaE00, used-color
count, total weighted pixels, and mean/p95 delta versus 221.

## Hard Gates

The framework supports exact hard gates for Pattern total consistency,
protected component deletion/split, protected endpoint loss, frozen input hash
mismatch, input nondeterminism, explicit-alpha preservation, and privacy/network
boundaries. Arbitrary corpus-wide percentage tolerances are not frozen in A01.

A failed critical gate remains visible per case and returns a non-zero command
status. Aggregate results cannot hide it.

## Deterministic Scorecard

The canonical outputs are:

```text
generator-quality-scorecard.json
generator-quality-summary.md
```

Cases sort by ID. Categories, sizes, modes, profiles, keys, numeric
normalization, and LF serialization are stable. Canonical data excludes time,
machine identity, absolute paths, and performance timing. Performance evidence
is emitted separately as a non-canonical Node diagnostic with no browser or
mobile SLA claim.

## Command and Write Safety

The development command is:

```text
npm run quality:generator
```

It explicitly runs `--corpus synthetic`, validates the development manifest
and frozen artifacts, executes replay, writes ignored local reports, and fails
on hard-gate violations.

Authoritative baseline writing requires an explicit external mode and version:

```text
npm run quality:generator -- --corpus external --write-baseline 1.0.0
```

It is rejected unless the manifest is `complete`, every declared external input
is present with its approved hash, and the target version does not already
exist. Existing baseline versions are never overwritten. Q01-A01 does not write
or freeze a production baseline.

## Next Stage

Q01-A02 may add the approved curated corpus, browser-compatible local decode
runner, complete manifest, and initial baseline capture. Only after that
baseline is reviewed may H03 Architecture C be evaluated as a candidate. E05
evidence refresh remains later and E05-D02 stays blocked until background
removal is frozen.
