# P1-A02.1 Public Branding Boundary Review

Review date: **2026-07-29**

Result: **Accepted with follow-up**

## Original field risk

The original PaletteColor `brand`, `code`, `name`, and `series` fields mixed
internal source provenance with customer presentation. A UI, exporter, Shopify
message, or error serializer could reasonably spread or render that object and
expose the internal reference-system name/code as if it were Poparooz customer
branding. No production palette or external consumer existed, so P1-A02.1 makes
the intentional breaking correction without a compatibility layer.

## New field boundary

- `referenceSystem`, `referenceCode`, optional `referenceName`, and optional
  `referenceSeries` are internal source/audit fields.
- `displayBrand`, `displayCode`, and `displayName` are Poparooz customer
  presentation fields.
- Removed fields are rejected by strict parsing; no alias or `??` fallback
  remains.
- Internal and display codes are separately normalized and unique.

## Public Mapper

`PublicPaletteColorSchema` is strict and fixes brand to Poparooz.
`toPublicPaletteColor` creates a fresh whitelist object using only display
code/name, HEX, and finish presentation. It does not spread internal data or
accept an override brand. Reference, provenance, supplier, product-handle, and
variant-ID fields are excluded.

The domain barrel exports separate `internalPalette` and `publicPalette`
namespaces so customer modules have an explicit import boundary. Test fixtures
are exported by neither namespace.

Future UI, materials, accessibility text, Canvas labels, PNG, customer CSV,
downloads, Shopify presentation, SEO, metadata, public responses, and visible
analytics must consume this Public Presentation API. Internal matching, import,
audit, licensing, and verified commerce mapping may use full internal records.

## Tests

Tests cover the breaking field migration, independent normalization and
uniqueness, fixed reference/display brands, deliberate internal/public fixture
differences, whitelist mapping, strict unknown-field rejection, absent internal
and Shopify fields, and JSON serialization without the internal reference-system
name. Exact final test counts are recorded in the completion report.

## Documentation authority

- `POPAROOZ_PUBLIC_BRANDING_CONTRACT.md` governs every customer-visible output.
- `POPAROOZ_MARD_PALETTE_CONTRACT.md` governs internal reference data only.
- The Source of Truth resolves conflicts and links both contracts.
- Product Decisions define customer-facing scope.
- Data/Algorithm Contracts require public mapping at every output boundary.
- Acceptance Criteria make brand-leakage checks mandatory in future phases.
- The Roadmap records P1-A02.1 as a completed gate before P1-A03.

## Repository review

The existing placeholder page, HTML metadata, accessibility text, errors, and
README were inspected. Customer-visible application content already uses only
Poparooz and required no UI redesign. Internal technical documentation retains
the truthful MARD source name.

## Follow-up

- No formal Poparooz display-code list or production internal palette exists.
- Node/npm remain absent from the system PATH; checks use the bundled runtime.
- `origin/main` remains `[gone]`, and the current Git lacks its HTTPS remote
  helper. Resolve both before the first push.

## P1-A03 entry condition

P1-A03 may begin only after this commit is separately accepted. It must remain
limited to a clearly labeled import test fixture, source boundary, and import
validation. It must not add production palette/display codes or later
image/algorithm/Worker/Canvas/UI work.
