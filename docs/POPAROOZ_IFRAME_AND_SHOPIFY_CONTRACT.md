# Poparooz Iframe and Shopify Contract

Status: **Frozen Phase 0 architecture contract; no deployment code implemented**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

## Deployment decision

Poparooz Generator formally uses **an independently deployed Vercel application embedded in a Shopify page by iframe**.

| Boundary | Production target |
| --- | --- |
| Shopify store | `https://www.poparooz.com` |
| Shopify tool page | `https://www.poparooz.com/pages/fuse-bead-pattern-maker` |
| Generator | `https://generator.poparooz.com` |
| Vercel default/preview URLs | Development and deployment verification only; not the lasting public entry |

The generator must retain its complete core flow when opened directly. Loading through Shopify may add surrounding content and commerce navigation, but cannot be required for uploading, generating, reviewing materials, or downloading MVP-A outputs.

This contract does not deploy Vercel, bind a domain, modify a Shopify theme, or create an iframe implementation during Phase 0.

## Responsibility boundary

### Shopify parent owns

- theme header, navigation, menus, and brand context;
- canonical/SEO page content, instructions, FAQ, and privacy explanation;
- product collection entry points and cart;
- iframe container, verified height application, loading/error state, and full-screen fallback;
- any later same-origin Shopify Cart API bridge.

### Vercel generator owns

- image selection and browser-local decoding/processing;
- MARD matching and pattern generation;
- Canvas workspace and settings;
- bead, material, and board statistics;
- PNG and CSV downloads;
- standalone responsive operation;
- outbound messages constrained by this versioned contract.

Generator failure must not directly impair Shopify checkout. Generator deployment, rollback, testing, and versioning are independent from the Shopify theme.

## Explicitly rejected for MVP-A

MVP-A does not implement a Shopify App, Embedded App, Admin App, App Proxy, Shopify CLI project, deep theme customization, database, account system, Docker/WSL requirement, remote image processor, Cart API, or direct iframe control of the Shopify cart.

The architecture intentionally accepts two deployment boundaries, cross-origin security configuration, responsive height handling, mobile full-screen fallback, a custom generator domain, CSP/`frame-ancestors`, environment separation, and independent generator version records.

## MVP-A user flow and configuration

The Shopify flow is: load the tool page → load the generator iframe → generate locally → inspect materials → download PNG/CSV → explicitly select `Get Beads for This Pattern` → navigate to the configured Poparooz bead collection.

MVP-A does not calculate packs, choose variants, read inventory, batch/partially add items, suggest shortage substitutes, or call Cart API.

URLs and allowed origins are centrally configured, validated as HTTPS production origins, and never hard-coded inside React components. Candidate environment names are:

```text
VITE_SHOP_URL
VITE_BEADS_COLLECTION_URL
VITE_ALLOWED_PARENT_ORIGINS
VITE_GENERATOR_PUBLIC_URL
```

Names may follow the project's eventual configuration convention. Secrets must not use client-exposed `VITE_` variables. Configuration cannot contain temporary, local, or preview values in a production build.

## Shopify Custom Liquid structural baseline

The following is an implementation reference, not Phase 0 production code:

```html
<div
  id="poparooz-generator-container"
  data-generator-origin="https://generator.poparooz.com"
>
  <iframe
    id="poparooz-generator-frame"
    src="https://generator.poparooz.com"
    title="Poparooz Fuse Bead Pattern Generator"
    loading="lazy"
    allow="clipboard-write; fullscreen"
    referrerpolicy="strict-origin-when-cross-origin"
  ></iframe>

  <p>
    <a
      href="https://generator.poparooz.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      Open Pattern Maker Full Screen
    </a>
  </p>
</div>
```

The final implementation must additionally decide and test sandbox tokens, CSP, `frame-ancestors`, download/new-window/full-screen permissions, development and preview origins, failure UI, and canonical/index behavior.

## Versioned messages

Messages use the envelope defined in [`POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md`](POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md):

```ts
interface GeneratorMessage<T = unknown> {
  source: "poparooz-generator";
  version: 1;
  type:
    | "generator.ready"
    | "generator.resize"
    | "generator.shop"
    | "generator.analytics"
    | "generator.error";
  payload: T;
}
```

Every payload has an exact runtime schema and bounded values. Unknown versions/types/fields are rejected or ignored without side effects. Messages never contain images, file names, paths, pixels, thumbnails, Base64, fingerprints, or image features.

`generator.shop` carries an allowlisted collection key plus evidence of a current explicit user gesture—not an arbitrary URL. The parent maps that key to its own trusted configuration.

When running standalone without an embedding parent, the same explicit action may navigate using the generator's own centrally validated collection configuration. Embedded mode delegates navigation to the verified parent; neither mode accepts a message-provided or component-hard-coded destination.

## Resize contract

```ts
interface GeneratorResizeMessage {
  source: "poparooz-generator";
  version: 1;
  type: "generator.resize";
  payload: {
    height: number;
  };
}
```

The child observes document/layout size with `ResizeObserver` and sends a throttled/debounced update after initial readiness, layout changes, image selection, generation completion, error changes, Settings/Materials expansion, and viewport changes. It sends only to a configured allowed parent origin and removes observers/listeners on unload.

The parent accepts the message only when:

- `event.origin` equals the configured generator origin;
- `event.source === iframe.contentWindow`;
- source, version, type, and payload schema match exactly;
- `height` is a finite integer within implementation-defined tested minimum/maximum bounds.

Negative, string, non-finite, extreme, or unknown values are rejected. The iframe must not rely indefinitely on a fixed height such as `640px`; the desktop and mobile acceptance tests must demonstrate no clipped content, avoidable nested scroll, or unusable expanded materials.

## Origin and environment policy

- Production child origin: exactly `https://generator.poparooz.com`.
- Production parent origin: exactly `https://www.poparooz.com`, unless an additional canonical Shopify origin is explicitly verified and approved.
- Production `postMessage` never uses `targetOrigin="*"`.
- Vercel preview origins are denied by production by default. A test environment may use an explicit, short-lived allowlist separate from production.
- Development origins are explicit configuration values, never permissive wildcards.
- The child validates inbound parent origin before accepting control messages; the parent validates child origin and window identity.

## CSP, frame and capability policy

Before Phase 3 release:

- generator CSP `frame-ancestors` lists only approved Shopify parent origins;
- the Shopify page permits frames only from the production generator origin;
- HTTPS and the custom domain are verified;
- sandbox behavior is tested with the minimum required tokens. The current candidate is `allow-scripts allow-same-origin allow-downloads`; every addition needs a recorded reason;
- download, clipboard, new-window, and full-screen capabilities are minimized and tested across target browsers;
- popup permission is absent unless an accepted user flow requires it;
- the full-screen link uses `noopener noreferrer`;
- iframe load timeout/failure reveals an explanatory state and direct full-screen link.

Canonical URL and search indexing behavior for the standalone generator versus Shopify content page are decided during deployment; neither is assumed in Phase 0.

## Mobile and full-screen fallback

The embedded experience is the default, but the Shopify page always exposes `Open Pattern Maker Full Screen`. This mitigates mobile iframe file-picker, download, virtual keyboard, fixed-theme-header, nested-scroll, and Canvas gesture constraints.

The generator's own mobile order is Canvas → Summary → Settings → Materials → Download → Get Beads. Settings and Materials are collapsible. It is prohibited to compress the desktop three-column workspace into the iframe or rely on hover.

## Deferred Phase 5 cart bridge

Phase 5 may add this separately accepted flow: compute MARD requirements → apply approved reserve policy → convert verified pack sizes → parent maps trusted Poparooz variants/inventory → iframe sends a versioned material-requirement message after an explicit user click → parent validates and calls same-origin Shopify Cart API → parent returns a bounded result.

The iframe never sends executable code or an arbitrary destination URL, never controls the cart directly, and cannot unilaterally choose trusted variants, prices, inventory, or pack sizes. A new or extended protocol version and runtime schemas are required before implementation.

## Phase 3 acceptance summary

Detailed checks live in [`POPAROOZ_ACCEPTANCE_CRITERIA.md`](POPAROOZ_ACCEPTANCE_CRITERIA.md). At minimum, desktop and target mobile browsers must prove loading, upload, generation, Canvas interaction, downloads/fallbacks, collection navigation, dynamic height, full-screen operation, exact-origin rejection, payload validation, privacy-safe messaging, and continued absence of Cart API in MVP-A.
