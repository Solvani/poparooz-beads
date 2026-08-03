# P3-A01.4-D01 Runtime Palette Contract

Status: **Accepted and Frozen**

Date: **2026-08-03**

Authority: [`POPAROOZ_FORMAL_PALETTE_CONTRACT.md`](POPAROOZ_FORMAL_PALETTE_CONTRACT.md)

## 1. Scope

P3-A01.4 owns this one-way boundary:

```text
Approved Formal Palette
-> Node-only deterministic Runtime compiler
-> Versioned Runtime Palette Artifact
-> Node-only Runtime Lock
-> Build Production Gate
-> Browser Runtime validation
-> Immutable Runtime Palette Provider
-> Startup Palette Gate
```

P3-A01.4 does not own:

- catalog sellability;
- inventory;
- `packSize`;
- Shopify fields;
- Download;
- Get Beads;
- Substitute application;
- automatic missing-color replacement;
- BoardProfile production wiring;
- ProcessingPolicy production wiring;
- the Maximum Colors `2..64` policy correction;
- matcher contract migration; or
- complete `GenerationRuntime` activation.

After P3-A01.4, the Runtime Palette may be loaded and validated safely, but the complete production generator must not be described as activated.

## 2. Runtime Artifact Schema

The top-level v1 contract is:

```ts
interface RuntimePaletteArtifact {
  schemaVersion: "1.0.0";
  artifactVersion: "1.0.0";
  paletteId: "poparooz-standard";
  paletteVersion: "1.0.0";
  referenceSystem: "POPAROOZ";
  recordCount: 221;
  activeCount: 221;
  autoMatchEligibleCount: 221;
  colors: readonly RuntimePaletteColor[];
}
```

The v1 color contract is:

```ts
interface RuntimePaletteColor {
  code: string;
  hex: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
  lab: {
    l: number;
    a: number;
    b: number;
  };
  sortOrder: number;
  active: boolean;
  autoMatchEligible: boolean;
}
```

Unknown fields are forbidden. The v1 Artifact must not contain:

```text
displayName
displayBrand
name
series
seriesNumber
seriesRank
canonicalSourceIndex
sourceLocation
digitalColorStatus
physicalColorStatus
isSellable
isSpecialFinish
finish
substitutes
codeA
codeB
applicationPolicy
packSize
inventory
Shopify fields
source hashes
compiler paths
generatedAt
generatedBy
```

No approved color names exist for v1, so `displayName` is not present. Poparooz customer branding belongs to the customer-facing projection and is not duplicated in the Runtime Artifact.

## 3. Runtime Ordering

- Runtime colors use the approved Formal Palette business order.
- `sortOrder` is a contiguous integer sequence from `0` through `220`.
- Every `code` is unique.
- Every `sortOrder` is unique.
- The Runtime Artifact does not expose `canonicalSourceIndex`.
- The compiler must verify that Formal business order and Runtime order agree.

## 4. RGB and Lab Derivation

The only approved derivation path is:

```text
approved HEX in normalized-palette.json
-> compileFormalPaletteColors()
-> full-precision RGB and Lab
-> compare with color-derivation-audit.json
-> Runtime Artifact
```

The Derivation Audit is validation and audit evidence. Its serialized, rounded Lab values are not the numeric source for future matching.

The following are forbidden:

- using serialized, rounded Lab from the Derivation Audit as the computation source;
- recomputing RGB or Lab in the browser;
- reading XLSX in the browser; and
- reading Substitute data in the Runtime compiler.

## 5. `active` Policy

`active` means that a color belongs to the current approved Runtime Palette and may exist in the Runtime Palette Snapshot.

`active` does not mean that a color:

- is in stock;
- is sellable;
- is purchasable;
- is listed in Shopify; or
- has completed instrument-based physical color verification.

The v1 policy is fixed:

```text
activeCount = 221
```

## 6. `autoMatchEligible` Policy

`autoMatchEligible` means that an active color is allowed to participate in automatic color-distance matching.

The frozen invariant is:

```text
autoMatchEligible = true
-> active = true
```

Eligibility does not depend on sellability, inventory, Shopify, or `packSize`.

The v1 policy is fixed:

```text
autoMatchEligibleCount = 221
policyOverrides = []
```

## 7. Versioning

These versions are independent:

- `schemaVersion`;
- `paletteVersion`; and
- `artifactVersion`.

Their initial values are all `1.0.0`, but they are not permanently required to remain equal.

- A change to Formal color records or approved HEX values increments `paletteVersion`.
- A change only to active or eligibility policy increments `artifactVersion` without requiring a `paletteVersion` change.
- A Runtime JSON structure change increments both `schemaVersion` and `artifactVersion`.
- A compiler refactor that preserves identical output bytes does not increment the Artifact version.
- A compiler change that changes output bytes requires an explanation and an `artifactVersion` increment.

## 8. File Locations

The browser Runtime Artifact location is:

```text
src/runtime/palette/artifacts/
  poparooz-standard/
    formal-1.0.0/
      runtime-1.0.0/
        runtime-palette.json
```

The Node-only Runtime Lock location is:

```text
data-source/runtime-locks/
  poparooz-standard/
    formal-1.0.0/
      runtime-1.0.0/
        runtime-palette.lock.json
```

- The Formal Palette `1.0.0` directory has an exact-inventory contract.
- The Runtime Lock must not be placed inside the Formal Palette directory.
- The Runtime Lock must not be imported by `src/**`.
- The Runtime Artifact is the only generated data file permitted to enter the browser bundle.

## 9. Determinism

The Runtime Artifact uses:

- UTF-8 encoding;
- LF line endings;
- fixed field order;
- fixed two-space indentation; and
- exactly one final newline.

It contains no timestamp, random value, absolute path, user name, or machine identity. Identical Formal input, Runtime Policy, and compiler contract must produce byte-identical output.

## 10. Gate Responsibilities

### Build Production Gate

The Build Gate verifies:

- approved Formal identity and hashes;
- Runtime Artifact hash;
- Runtime Lock;
- `recordCount`, `activeCount`, and `autoMatchEligibleCount`;
- exact Runtime inventory;
- forbidden-field absence; and
- the production bundle boundary.

### Startup Palette Gate

The Startup Gate verifies:

- Runtime schema and identity;
- record counts;
- code uniqueness;
- `sortOrder` uniqueness and contiguity;
- HEX and RGB validity;
- finite Lab values and the Lab L range;
- the active/eligibility invariant; and
- unknown-field rejection.

Cryptographic hash integrity is handled at build time. Browser startup does not rebundle Formal hashes, the Runtime Lock, or source-audit information.

## 11. Fail-closed Behavior

Any Gate failure forbids:

- legacy Palette fallback;
- test-fixture fallback;
- empty-Palette fallback;
- partial-Palette continuation;
- filtering invalid colors and continuing;
- Formal JSON fallback;
- browser XLSX parsing;
- remote Palette download; and
- warning-only behavior.

On startup failure:

- no Palette Provider is created;
- no Palette-dependent Generation Service is created;
- `GenerationRuntime` remains unavailable;
- the generator cannot enter ready or processing; and
- customer-visible errors do not contain internal paths, hashes, Zod errors, or stack traces.

## 12. Existing Legacy Contract Boundary

The current legacy contract has these known conflicts:

- the legacy Palette Schema requires `isSellable`;
- the legacy Palette Schema requires `isSpecialFinish`;
- the legacy matcher includes sellability in automatic-match eligibility; and
- the Formal Palette has no approved sellability or finish evidence.

P3-A01.4 therefore freezes these restrictions:

- do not adapt the Runtime Artifact to the legacy `PaletteDefinition`;
- do not create a fictional `isSellable` value;
- do not infer `isSpecialFinish`;
- do not modify the matcher;
- do not activate the complete `GenerationRuntime`; and
- decouple the Runtime matching contract from catalog sellability only through a later, separately authorized task.
