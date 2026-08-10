# P3-A02-A05 Fixed Color Set Profile Data Contract

## 1. Status and Authority

```text
Stage: P3-A02-A05
Name: Fixed Color Set Profiles
Status: Contract Frozen / Implementation Pending
```

This document freezes the source data, canonical group membership, published
v1 Profile definitions, derivation, and validation contract for the first
Poparooz fixed Color Set Profiles. It does not authorize an Artifact, Provider,
adapter, Runtime wiring, Worker change, UI change, or Production
`GenerationRuntime` activation.

The formal 221-color Palette remains the sole color-identity and numeric-color
authority. This contract owns only fixed set membership expressed through
approved Poparooz color codes.

## 2. Source Identity

```text
Source workbook: data-source/color-sets/Poparooz色卡-套装明细.xlsx
Source workbook SHA-256: a32aac97868a8740c4e4d5bf981f434997708beea710a6493abaf15848179f0c
Membership worksheet: 套装明细
Worksheet used range: A1:AB44
Values-only used range: A2:AB44
```

The source workbook also contains `221色卡` and `替代色参考`. The `221色卡`
worksheet was verified as an exact 221-code and HEX match to the frozen formal
Palette. Substitute data is not part of this contract and must not affect fixed
Color Set membership.

The formal Palette authority is:

```text
paletteId: poparooz-standard
paletteVersion: 1.0.0
recordCount: 221
Palette Canonical SHA-256: 1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4
```

## 3. Group Contract

Groups `1` through `8` contain exactly `24` distinct colors each. Group `9`
contains exactly `29` distinct colors. Across all groups there are exactly
`221` rows and `221` distinct approved Poparooz color codes.

Membership is frozen as follows. Codes within each group are listed in formal
Palette order.

```text
Group 1 (24): G1 H1 E2 H2 B3 C3 H3 A4 E4 H4 B5 C5 F5 G5 H5 A6 D6 A7 D7 G7 H7 B8 C8 D9
Group 2 (24): C2 D3 E3 C6 C7 E7 E8 F8 G8 G9 A10 C10 A11 C11 B12 A13 C13 D13 F13 G13 D15 D18 D19 D21
Group 3 (24): E1 D2 G2 A3 G3 E5 B7 F7 D8 B10 F10 D11 D12 E12 E13 B14 D14 C16 D16 B17 B18 B19 B20 D20
Group 4 (24): F1 F2 F3 F4 D5 M5 E6 F6 H6 M6 E9 F9 M9 E10 E11 F11 F12 M12 A14 E14 F14 G14 E15 G17
Group 5 (24): A1 B1 C1 D1 B2 B4 C4 A5 B6 G6 A8 A9 C9 B11 A12 H12 B13 C14 A15 B15 C15 B16 C17 D17
Group 6 (24): M1 A2 M2 M3 G4 M4 M7 H8 M8 H9 G10 H10 M10 G11 H11 M11 G12 H13 M13 H14 M14 G15 M15 G16
Group 7 (24): A16 E16 F16 A17 E17 F17 H17 A18 E18 H18 A19 E19 H19 E20 A21 F21 A22 F22 D23 F23 A24 B24 E24 F24
Group 8 (24): H15 G18 A20 H20 C21 H21 C22 H22 A23 C23 H23 C24 A25 C25 A26 B26 B27 C27 B28 C28 B29 B30 B31 B32
Group 9 (29): D4 B9 D10 C12 F15 H16 C18 F18 C19 F19 G19 C20 F20 G20 B21 E21 G21 B22 D22 E22 B23 E23 D24 B25 D25 F25 C26 D26 C29
```

The deterministic per-group membership hashes are:

```text
Group 1: 8d3577b15600c0857a443e31455dd38d67e49f479d4251dfaeafbac98a5aa65d
Group 2: 853e839804292de335f8c6b9c26a0002410115f7aaaca9d047be1d31a9f8b995
Group 3: c57a828562ce5aecccbea0701c81883f9122f45104c5ca066a270b0ee3deaa20
Group 4: c729a759c6b94ef45edca24c24995fe3600b4e9c02197900778b776056f30d46
Group 5: 5a76d52c34d58b065b51ace5a2fa001d0dc0d31a95e8e12144854380273103c0
Group 6: ec1d6430dce23698ff9372cdb112159f897de495f0f42b291bba70855b3a135d
Group 7: de5daf25b81c84b59b098429431ca2a7b744987acd2ba42a683ae2589436b17e
Group 8: cd3570ca5e98194d291f1fc526d8b20adfd862c3a495096c8954d1bb626b7bec
Group 9: c0a429ceaf0695014272a8eca17ec2eb5fe0d2c9d1d0af8746c507fe46f82799
```

## 4. Published v1 Profiles

The complete published and selectable v1 Profile list is:

```text
poparooz-set-24: 24 colors, group 1
poparooz-set-48: 48 colors, groups 1-2
poparooz-set-72: 72 colors, groups 1-3
poparooz-set-120: 120 colors, groups 1-5
poparooz-set-168: 168 colors, groups 1-7
poparooz-set-221: 221 colors, groups 1-9
```

The published v1 Profiles are strictly nested:

```text
24 ⊂ 48 ⊂ 72 ⊂ 120 ⊂ 168 ⊂ 221
```

The increments are intentionally non-uniform. The `72 -> 120` transition adds
groups `4-5`, the `120 -> 168` transition adds groups `6-7`, and the
`168 -> 221` transition adds groups `8-9`.

The deterministic published Profile membership hashes are:

```text
poparooz-set-24: ac97b53db5b7b9baab9ad37a156557e8f7edd911c6e3fe938000b8495f7f59c5
poparooz-set-48: d5d082e467a9113a2a702d0b5d00fe1e248c7e016c1edb6f87323c9b381879c1
poparooz-set-72: e76f71ffa76069dee6742a761ab8f49450bcf3c7e60bb762c7f5b494861a63eb
poparooz-set-120: 415f53de6840ee9e083da336199e944ac8c009e3aa44bb7370e8388f1f23deb5
poparooz-set-168: 3137b4e30aed1132f8cbc0e06eb4d76a34f0a5da98dd806c56346493317275e7
poparooz-set-221: 8097d031ba046eea3a3cc53ac373ce175a88a47060331ad0570835de14cb373f
```

Per-Profile membership serialization is:

```text
profileId<TAB>code<TAB>hex<LF>
```

Colors are serialized in frozen formal Palette canonical source order.

## 5. Unpublished Cumulative Boundaries

The canonical groups also form these valid cumulative boundaries:

```text
24 colors: group 1
48 colors: groups 1-2
72 colors: groups 1-3
96 colors: groups 1-4
120 colors: groups 1-5
144 colors: groups 1-6
168 colors: groups 1-7
192 colors: groups 1-8
221 colors: groups 1-9
```

Only `96`, `144`, and `192` are unpublished boundaries:

```text
96: not published in v1, not selectable in v1, not exposed as a Runtime Profile in v1
144: not published in v1, not selectable in v1, not exposed as a Runtime Profile in v1
192: not published in v1, not selectable in v1, not exposed as a Runtime Profile in v1
```

Groups `4`, `6`, and `8` and all of their members remain part of the complete
canonical group dataset because they contribute to the published `120`, `168`,
and `221` Profiles. The unpublished boundaries are valid reserved cumulative
boundaries, not invalid data, and this contract does not determine whether they
may be published in a later version.

## 6. Canonical Identities

The canonical membership serialization is:

```text
group<TAB>code<TAB>hex<LF>
```

Groups are serialized in ascending numeric order. Within each group, records
are serialized in frozen formal Palette canonical source order. Codes and HEX
values must match the formal Palette without normalization that changes their
approved values.

```text
Canonical Memberships SHA-256: 0010d6e5084074a62869ea44abc4da874131177ac4c7c52375ae60ccd87f1639
```

Published Profile definition serialization is:

```text
profileId<TAB>size<TAB>comma-separated-group-numbers<LF>
```

Profiles are serialized in ascending size order.

```text
Published Profile Definitions SHA-256: 2d5338fe221cf21de68175edf93ac8d2705969f4c4139ca370b5b6fd6937a18b
```

## 7. Validation Contract

Any future compiler or Provider must fail closed unless all of the following
are true:

- groups `1` through `9` all exist;
- group counts are exactly `24, 24, 24, 24, 24, 24, 24, 24, 29`;
- total membership rows and distinct codes are both exactly `221`;
- no code occurs in more than one group;
- every code exists in the approved formal Palette;
- every source HEX equals the approved formal Palette HEX for that code;
- no approved formal Palette code is missing;
- the six published Profile IDs, sizes, and group expressions match exactly;
- published Profile counts are exactly `24, 48, 72, 120, 168, 221`;
- every published Profile is strictly nested in the next published Profile;
- `96`, `144`, and `192` remain valid unpublished cumulative boundaries;
- no unpublished boundary is selectable or exposed as a v1 Runtime Profile;
- the `221` profile exactly equals the approved formal Palette;
- canonical membership serialization matches its frozen SHA-256; and
- published Profile definition serialization matches its frozen SHA-256.

No partial, empty, fixture, cached, inferred, substitute-derived, or remote
fallback is permitted.

## 8. Runtime and Product Semantics

A fixed Color Set Profile is an eligibility projection over the approved
`GenerationPaletteSnapshot`. It is not a second Palette and must not duplicate
RGB, Lab, ordering, activity, or other color payload in a browser Artifact.

Future generation eligibility for a selected fixed profile must require all of:

```text
code belongs to the selected fixed profile
active = true
autoMatchEligible = true
```

Profile size is separate from the customer `Maximum Colors` setting. Selecting
a profile limits which approved colors may be considered; `Maximum Colors`
still limits the number of colors used in one generated Pattern under its
separately frozen `2 / 32 / 64` policy.

For example, selecting `poparooz-set-72` with `Maximum Colors = 24` means the
candidate domain is the approved 72-color Profile and the generated Pattern
may use no more than 24 of those candidates. It must not mean selecting any 24
colors from the full 221-color Palette.

The formal Color Set dataset may later support separate Generator and
Shopify/catalog projections. Shopify, catalog, inventory, pricing, or Variant
data must not become the Generator source of truth.

The source XLSX is Node-only evidence. It must not enter the browser production
module graph. Customer-visible output may expose only separately approved
Poparooz public color fields and must not expose group numbers, source paths,
hashes, internal validation details, supplier data, `MARD`, or another
third-party brand.

## 9. Explicitly Deferred

P3-A02-A05 data-contract freeze does not authorize:

```text
fixed Color Set Artifact
compiler or publication pipeline
browser schema or Provider
Runtime or bootstrap wiring
GenerationRuntime activation
Worker wiring or retry behavior
ProcessingPolicy implementation
UI controls or default-profile selection
automatic image or Pattern sizing
Runtime Palette changes
matcher or CIEDE2000 changes
substitute application or replacement
inventory or catalog sellability
packSize or pack calculations
Shopify
Download, PDF, or PNG work
Get Beads
multi-Palette selection
```

Production `GenerationRuntime` remains unavailable. P3-A02-A05 implementation
has not started and is not authorized by this contract alone.
