# Poparooz P3-A03-E04 Email Download Gate Contract

Stage: `P3-A03-E04-A01`

Status: **EMAIL DOWNLOAD GATE CONTRACT FROZEN / PRODUCTION IMPLEMENTATION NOT STARTED**

This is a product, privacy, and architecture contract. It does not implement
the Email Download Gate, an email backend, provider integration, infrastructure,
or any production behavior.

## 1. Stage Scope

P3-A03-E04 may add a normal-customer-flow email-verification gate before the
existing local PNG download. The gate is a business-flow authorization step,
not DRM, an account system, or a claim that browser developer tools cannot
bypass it.

This contract authorizes no production implementation. A later, separately
authorized stage must implement and verify every boundary below.

## 2. Customer Flow

The frozen target flow is:

```text
successful Pattern
-> Save / Download Pattern
-> valid local unlock for the current gate contract version?
   -> yes: existing local PNG download
   -> no: accessible Email Download Gate
-> submit required email
-> complete actual email verification
-> persist the minimal local unlock marker
-> resume the originally requested local PNG download
```

No account, password, or Shopify customer login is created. A valid unlock has
no periodic expiry in the current product scope. It applies only to the same
browser storage context and current Email Gate contract version.

## 3. Download Interception Boundary

The current production path is:

```text
PatternActions
-> App.downloadLastSuccess()
-> PatternDownloader.download()
-> browser Canvas
-> PNG Blob
-> Object URL
-> local browser download
```

The future gate belongs between `App.downloadLastSuccess()` and
`PatternDownloader.download()`. It must not enter or change the export renderer,
Canvas-to-Blob path, filename logic, PNG geometry, material quantities, or the
download environment.

One pending download intent may be retained in memory while verification is in
progress. It contains only the successful result identity and a bounded resume
action; it is not persisted or sent to the backend. If that result is removed
or replaced before verification completes, the pending intent is cancelled and
the customer must click Download again. Verification must not silently download
a different Pattern or trigger duplicate downloads.

## 4. Verification Semantics

- A first unlock requires server-confirmed proof that the customer can receive
  mail at the submitted address. Client-side syntax validation alone is not
  verification.
- The mechanism may be a code or an equivalent secure verification mechanism.
  Provider and delivery mechanism selection are deferred.
- A link-based mechanism, if selected later, must securely bind to the issued
  challenge and let the original browser context observe only a bounded verified
  result. Pattern or image data must not be carried in the link or exchanged
  between tabs.
- A challenge is time-bounded and single-use, or has equivalent replay-resistant
  semantics. Successful use and replacement by resend invalidate prior use.
- Verification is server-authoritative. The browser writes an unlock marker only
  after a successful bounded verification response.
- Verification does not create an account, password, customer profile, or
  cross-device session.

Email normalization must be consistent on client and server. It may trim
surrounding whitespace and canonicalize the domain safely, but the exact
provider-neutral normalization and international-address policy must be frozen
before implementation. The local part must not be destructively rewritten on
an unsupported assumption.

## 5. Local Unlock Semantics

The minimal persistence model is a generator-origin `localStorage` marker with
this logical content only:

```text
contractVersion: 1
unlocked: true
```

The implementation may use a versioned key such as
`poparooz.email-download-gate.unlock.v1`. It must strictly validate the value;
missing, malformed, unknown-version, or false values mean locked. The marker
contains no email address, challenge, consent state, Pattern identity, or image
information.

The marker is deliberately a product-flow convenience marker. It is not
authentication. It is not a cryptographic credential, a server-issued session,
DRM, or continuing proof that the same person still controls the email address.
It may be inspected or changed through browser developer tools; E04 gates the
normal customer flow rather than providing tamper-proof access control. Clearing
site storage, using another browser/profile/device, private browsing, storage
partitioning, or advancing the gate contract version may require verification
again. Cross-device synchronization is not supported.

If persistent storage is unavailable or a write fails after successful
verification, the current requested download may proceed, but the UI must state
that this browser may ask for verification again. It must not claim persistence
that was not achieved.

## 6. Browser Persistence Boundary

The raw or normalized email exists only in transient form state while the gate
is active. It must not be written to LocalStorage, SessionStorage, IndexedDB,
URLs, analytics, error reports, or arbitrary generator state. No source image,
Pattern, pending download, Blob, Object URL, or Pattern identity is persisted by
the gate.

An already-valid marker permits future downloads without a backend round trip.
Backend unavailability must not block an already unlocked browser from using the
existing local download.

## 7. Minimal Backend Responsibility

The future backend is a narrow Email Gate service, not a general Poparooz
backend. It may only:

- accept a bounded normalized email submission;
- issue and deliver a verification challenge;
- verify or invalidate that challenge;
- retain the minimum verification record required by the flow;
- retain an independent optional marketing-consent record;
- enforce resend, attempt, endpoint, and abuse controls; and
- return bounded challenge and verification results.

The backend must not generate, receive, render, store, or reconstruct the PNG or
Pattern. It must not become a dependency of image processing or generation.

## 8. Server-Side Data Allowlist

Only fields necessary for the bounded gate may reach or be retained server-side:

- normalized email address;
- opaque challenge identity and a safe verifier representation;
- challenge lifecycle state and timestamps;
- verification success timestamp and applicable gate contract version;
- optional marketing-consent state, timestamp, source/context, and consent
  version;
- bounded abuse-control metadata, such as coarse request timing, attempt state,
  and rate-limit state;
- bounded operational error categories that contain no submitted secret or
  generator content; and
- non-identifying aggregate counts allowed by the aggregate-first boundary
  below.

The raw or normalized email is allowed server-side only as bounded verification
data or separately consented marketing data. It must not be written to
application logs; access logs where application configuration can prevent or
redact it; analytics; distributed traces; exception metadata; monitoring
breadcrumbs; customer-facing or internal API error payloads; or arbitrary
operational metadata. It must not appear in URL paths, query strings, fragment
identifiers, or other locations commonly captured automatically by
infrastructure logs. Request-body logging for Email Gate endpoints must be
disabled or redacted.

Before production implementation, the later provider/infrastructure stage must
audit platform and provider defaults for application and access logging,
distributed tracing, request capture, exception capture, monitoring
breadcrumbs, retention, and redaction. Any abuse-control design that needs a
pseudonymous or derived correlation key requires separate authorization of its
derivation, reversibility, secret handling, and retention. This contract does
not authorize raw email as a logging or telemetry key. Bounded aggregate counts
remain allowed, but they must contain no customer-level email or reversible
email-derived identifier.

Exact retention periods, deletion procedures, geographic/storage requirements,
and provider-specific data fields require a later privacy and infrastructure
review. No field is authorized merely because a provider offers it.

### Aggregate-First Retention and Reporting Boundary

Long-term operational reporting must use non-identifying daily aggregates, not
raw email or customer-level verification records. A verification-only email
without marketing consent must not be retained indefinitely by default.

A later provider/infrastructure contract must select the shortest justified
operational retention window for verification delivery and retry,
customer-support investigation, abuse prevention and rate limiting, and safe
aggregate reconciliation. After that bounded window, verification-only email
and challenge records must be deleted or irreversibly anonymized. Deletion or
anonymization may occur only after the applicable aggregate record has been
durably written and the required bounded operational window has elapsed.

Aggregation failure must not cause premature deletion or silent loss of counts.
Aggregate reconciliation must be idempotent or equivalently duplicate-safe. An
email with explicit marketing consent follows a separate consent-controlled
retention, withdrawal, and deletion path; it must not be deleted merely because
operational aggregation completed.

Long-term aggregate data may contain only bounded counts such as:

- verification requests;
- verification successes;
- verification failures;
- marketing consent granted;
- marketing consent not granted;
- successful download unlocks; and
- deleted or irreversibly anonymized record counts.

Long-term aggregate data must contain no raw or normalized email, challenge
secret, Pattern data, image data, IP-address list, or customer-level record. If
separately authorized later, ChatGPT reports, emailed or Gmail daily summaries,
Analytics, and an Ops Dashboard may consume only aggregate, non-identifying
data. They are downstream consumers, not authorities for email verification,
retention, deletion, consent, or data cleanup. A downstream reporting failure
must not block or control the backend data lifecycle.

This subsection establishes a future aggregate-first privacy and reporting
boundary only. A01 authorizes no Gate analytics, scheduled aggregation,
scheduled task, report transport, or downstream reporting implementation. Exact
schedule, timezone, retention duration, storage technology, and report transport
remain deferred to the provider/infrastructure stage.

## 9. Server-Side Prohibited Data

The Email Gate backend must never receive or store:

- source images, pixels, thumbnails, Base64, filenames, local paths, file
  metadata, or image hashes/fingerprints;
- Pattern Matrix, Pattern content, Pattern hashes, PNG bytes, Blobs, Object URLs,
  export geometry, or material requirements;
- Generation Palette internals, supplier/reference identities, Worker data, or
  arbitrary generator settings/state;
- passwords, general account/customer-profile fields, Shopify credentials,
  cart data, price, inventory, or purchase history; or
- secrets or full verification codes/tokens in application logs.

Unknown request fields must be rejected or dropped by an explicit schema; they
must never be accepted into general-purpose metadata.

## 10. Marketing-Consent Independence

The frozen semantics are:

```text
verification_required_for_download = true
marketing_consent_required_for_download = false
```

Marketing consent must be an optional, separate, unchecked control. No silence,
verification action, or download action constitutes consent. Explicit decline
or absence of consent must never block challenge delivery, verification, local
unlock, or download.

A minimal auditable consent record contains only:

```text
consentState: granted | declined | not_present
consentTimestamp
consentSourceContext: email-download-gate
consentVersion
```

This contract makes no legal-compliance claim. Consent copy, withdrawal flow,
retention, jurisdictional requirements, and marketing-provider integration must
be reviewed before production implementation.

## 11. Privacy Boundary

User images and Pattern content remain browser-local throughout generation,
preview, export, and download. Email verification introduces a network request
only into the download-authorization gate. It does not introduce a network
dependency into generation or local PNG creation.

Gate analytics are not authorized by A01. Existing analytics restrictions
remain. Logs must use bounded categories and must not contain email challenge
secrets, source images, Pattern data, or arbitrary request bodies.

## 12. Failure and Recovery Behavior

| Condition                             | Required behavior                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Malformed email                       | Show a readable validation error; issue no challenge; remain locked.                                                       |
| Delivery failure                      | Show a safe, retryable message without exposing provider internals or account existence; remain locked.                    |
| Invalid verification                  | Show a safe invalid/expired message, count the attempt server-side, and remain locked.                                     |
| Expired verification                  | Require a new challenge; do not unlock from the expired challenge.                                                         |
| Resend requested                      | Apply throttling and replace or invalidate the prior challenge without revealing whether the address was previously known. |
| Network failure                       | Preserve safe transient form state where practical, offer retry, and remain locked.                                        |
| Backend unavailable                   | Show a safe retry-later state; do not fabricate verification or unlock. Already unlocked browsers continue local download. |
| Dialog closed                         | Cancel the pending download and transient challenge UI state; do not download. Preserve any pre-existing valid unlock.     |
| Email changed during verification     | Invalidate the current client challenge context and require a challenge for the new normalized email.                      |
| Verification succeeds, download fails | Keep the valid unlock marker and report the existing safe download failure; retry does not require reverification.         |
| Browser storage cleared               | Treat the browser as locked and require verification again.                                                                |
| Contract version changes              | Ignore the old marker and require verification under the new version.                                                      |
| Pattern removed or replaced           | Cancel the pending download intent; never substitute the new Pattern automatically.                                        |

Customer-facing errors must not reveal raw server errors, provider details,
whether an email is already known, internal identifiers, or security limits.

## 13. Accessibility Boundary

The future gate is a proper accessible modal dialog, not an automatic retrofit
of the mobile Bottom Sheet. It must provide:

- `role="dialog"` and `aria-modal="true"`;
- an explicit accessible title and associated instructions;
- focus entry, containment, and restoration;
- background isolation using the repository's proven inert/hidden pattern;
- keyboard-operable fields, verification, resend, and close controls;
- Escape and explicit Close behavior, with Close cancelling the pending
  download;
- readable field validation and status announcements; and
- a mobile-safe layout without horizontal overflow or hidden controls.

The later implementation must test these behaviors rather than infer them from
the existing Bottom Sheet.

## 14. Security and Abuse Requirements

- Challenges expire and are single-use or equivalently replay-resistant.
- Resend and verification attempts are throttled server-side.
- Endpoints have rate limits and bounded body sizes/schemas.
- Responses and timing avoid email/account enumeration where practical.
- Customer errors are safe and provider-neutral.
- Email-provider and signing secrets stay server-side and never enter Vite
  environment variables or browser bundles.
- CORS and origin checks use exact approved origins; wildcard origins are
  prohibited for credentialed or sensitive gate operations.
- Challenge secrets, full email-bearing request bodies, and arbitrary exception
  objects are not logged.
- Production and preview environments do not share unrestricted secrets or
  verification records.

Numeric expiry, resend, attempt, and rate-limit values are intentionally not
invented here. They require provider and abuse-risk evidence in the later
infrastructure stage.

## 15. Iframe and Origin Considerations

The gate is owned by the generator and renders inside the generator document in
both standalone and Shopify-iframe use. Shopify does not receive the email,
challenge, consent state, unlock marker, Pattern, or download content. The
current `generator.ready` and `generator.resize` protocol remains unchanged.

The API must accept only the exact approved generator origin and separately
approved non-production origins. The current production CSP uses
`connect-src 'self'`; a cross-origin API would therefore require an explicit CSP
and deployment-contract change. Same-origin Pages Functions or a Worker route,
and a separately hosted Worker API, remain candidates rather than frozen
choices.

The existing iframe `allow-downloads` behavior and local PNG path remain. Browser
storage partitioning may cause embedded and standalone contexts to have
different unlock persistence; E04 must not promise cross-context portability
without browser evidence.

## 16. Explicit Exclusions

E04-A01 does not authorize:

- React UI or state implementation;
- API endpoints, Cloudflare Workers, Pages Functions, D1, KV, or deployment
  configuration;
- email-provider selection or integration;
- accounts, passwords, Shopify customer login, Admin access, or customer-account
  creation;
- cloud Pattern/project/image storage or server-side generation;
- Commerce, cart, catalog, inventory, purchase, or board-policy changes;
- analytics or a general customer database; or
- changes to Pattern Matrix, processing, Quantizer, Matcher, Generation Palette,
  Generation Color Sets, `PublicPatternResult`, material authority,
  `DerivedMaterialRequirementV1`, PNG rendering, Board Layout, runtime, or Worker
  behavior.

## 17. Deferred Infrastructure and Provider Decisions

The following remain open for a separately authorized review:

- code versus link delivery UX and provider;
- Worker versus Pages Function and same-origin versus cross-origin routing;
- D1, KV, provider storage, or a minimal combination;
- exact request/response schemas and endpoint paths;
- email normalization and international-address support;
- challenge lifetime, resend, attempt, and rate-limit numbers;
- data retention, deletion, regional, consent-copy, and withdrawal requirements;
- production/preview secret separation, monitoring, and rollback; and
- browser evidence for storage partitioning and link completion across tabs.

Cloudflare infrastructure is a candidate because the generator already uses
Cloudflare Pages. This document does not freeze Cloudflare limits, pricing,
APIs, or suitability.

## 18. Implementation Entry Gate

Production implementation may begin only after:

1. this A01 contract is independently reviewed and frozen;
2. a provider/infrastructure stage freezes the bounded backend topology,
   schemas, secrets, data retention, abuse controls, and email delivery choice;
3. privacy review confirms the allowlist and prohibited-data tests;
4. UI work is separately authorized with modal, lifecycle, and resume-intent
   tests;
5. implementation proves the existing PNG output and browser-local generation
   path are unchanged;
6. standalone and Shopify-embedded browser verification covers success, failure,
   persistence, storage clearing, and accessibility; and
7. deployment changes, CSP/CORS, rollback, and provider failure behavior are
   explicitly accepted.

## Git Baseline

```text
branch: main
E04-A01 entry HEAD: 3dc0fd57865a2bce3c79d8622c464c82719cb35d
E04-A01 entry origin/main: 3dc0fd57865a2bce3c79d8622c464c82719cb35d
ahead / behind: 0 / 0
worktree at entry: clean
```

## Decision

```text
EMAIL DOWNLOAD GATE CONTRACT FROZEN
```

Production code and behavior remain unchanged. No backend, provider, or
Cloudflare infrastructure has been implemented or selected.
