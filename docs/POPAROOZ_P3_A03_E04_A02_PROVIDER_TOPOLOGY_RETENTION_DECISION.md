# Poparooz P3-A03-E04-A02 Provider, Topology, and Retention Decision

Stage: `P3-A03-E04-A02-A01`

Status: **A02 PROVIDER / TOPOLOGY / RETENTION DECISION FROZEN / PRODUCTION IMPLEMENTATION NOT STARTED**

This is a frozen documentation and governance decision. It fixes the bounded v1
direction but does not constitute provider or infrastructure acceptance,
authorize production implementation, or create any provider, Cloudflare, DNS,
database, secret, analytics, or reporting resource.

```text
FROZEN GOVERNANCE DIRECTION / PROVIDER AND INFRASTRUCTURE ACCEPTANCE PENDING
```

## 1. Authority and Scope

The primary authority remains
[`POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md`](POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md).
Every A01 browser-local privacy, consent independence, logging prohibition,
aggregate-first retention, failure, accessibility, and implementation-entry
boundary remains in force.

The preceding P3-A03-E04-A02-A00 read-only repository audit concluded:

```text
A02-A00 REPOSITORY AUDIT PASSED / READY FOR PROVIDER DECISION
```

This frozen decision governs only the provider, topology, storage product,
verification mechanism, abuse-protection direction, and bounded retention
direction. It does not define endpoint schemas, database tables, numeric
challenge/security limits, UI implementation, or deployment procedures.

## 2. Decision Summary

The selected v1 direction is:

```text
Static application host: existing Cloudflare Pages project
Email Gate compute: one standalone Cloudflare Worker
Production route candidate: path-scoped Workers Route for generator.poparooz.com/api/email-gate/*
API origin: same origin as the generator
Storage: D1 only
Abuse challenge: Cloudflare Turnstile plus mandatory server-side limits
Transactional provider: Resend, conditional on setup acceptance
Verification mechanism: one-time code
Sending domain: isolated Poparooz subdomain; notify.poparooz.com is the candidate
Scheduled lifecycle: the same Worker may expose fetch() and scheduled()
```

The static application is not migrated to Workers Static Assets. Pages
Functions are not selected. No separate `api.poparooz.com` hostname is selected.
The selected topology is a path-scoped Workers Route, not a Worker Custom
Domain. `custom_domain=true` must not be used for `generator.poparooz.com`;
Cloudflare Pages remains the existing origin for that hostname.

## 3. Static Hosting and Worker Route

Cloudflare Pages remains the static application host for the existing Vite
`dist` deployment. The future Worker handles only the bounded Email Gate route
space and must not intercept unrelated Pages assets, navigation, SPA fallback,
or application routes.

The production route candidate is:

```text
generator.poparooz.com/api/email-gate/*
```

This candidate does not by itself settle the no-trailing-slash base path
`generator.poparooz.com/api/email-gate`. The later endpoint and deployment
contract must deliberately cover both the base namespace path and the
slash-prefixed endpoint paths. No intended Email Gate request may fall through
to Pages and receive SPA HTML.

Unmatched requests continue to the existing Pages application. A matched but
unknown Email Gate path must fail safely rather than proxy arbitrary input to
the application. Before production, deployment acceptance must prove all of the
following:

- `generator.poparooz.com` has the required Cloudflare-proxied DNS record;
- the complete existing Worker Route inventory in the zone has been inspected;
- route specificity, priority, and coexistence do not conflict with another
  Worker;
- the Email Gate Route does not intercept Pages static assets, application
  navigation, SPA fallback, root application paths, or unrelated `/api` paths;
- the Route's quota fail mode is fail closed;
- route removal or rollback restores the previous Pages-only behavior; and
- Worker Custom Domain is not silently substituted for the selected Route.

The same Worker may later implement:

- `fetch()` for bounded Email Gate HTTP requests; and
- `scheduled()` for backend-owned aggregate reconciliation and retention
  cleanup.

Cloudflare documents Workers Routes as path-pattern handlers in front of an
existing proxied origin and documents Cron Triggers through a Worker's
`scheduled()` handler. These facts were retrieved on 2026-08-25 from:

- <https://developers.cloudflare.com/workers/configuration/routing/routes/>
- <https://developers.cloudflare.com/workers/configuration/routing/custom-domains/>
- <https://developers.cloudflare.com/workers/configuration/cron-triggers/>

The route and Cron Trigger do not exist yet. Their production behavior must be
verified before activation.

## 4. Same-Origin API and Iframe Boundary

The same-origin API direction is selected because it preserves the current
browser and deployment boundary:

- the current `connect-src 'self'` CSP remains sufficient;
- no separate cross-origin API hostname is introduced;
- normal same-origin requests require no cross-origin CORS grant;
- exact production and separately approved preview `Origin` validation remains
  mandatory;
- wildcard CORS is prohibited;
- unauthorized, unexpected, or non-production origins must fail closed; and
- production and preview secrets and D1 data must remain separated.

The browser API client must remain locked and treat every unapproved response
as failure, including Pages HTML fallback, HTML or text, a Cloudflare generic
error page, a `404` or `405` outside the approved API schema, a quota error, an
incorrect `Content-Type`, malformed JSON, an unknown response version, a wrong
response schema, or a successful HTTP status with an invalid body. Only an
approved HTTP status, exact JSON `Content-Type`, supported schema version, and
strictly validated response may advance the gate state.

Production `workers.dev` access must be disabled, or that endpoint must be
independently protected and proven unable to bypass the production boundary.
Worker Preview URLs must likewise be disabled, restricted, or independently
protected. Any alternate endpoint must enforce the same Origin, schema,
Turnstile, throttling, logging, and privacy rules; it must not share unrestricted
production secrets or D1 records or become an uncontrolled Email Gate API.

The Shopify iframe protocol remains unchanged and limited to the currently
authorized `generator.ready` and `generator.resize` messages. Shopify must not
receive the email, Turnstile token, challenge, consent state, unlock marker,
Pattern, or download content.

Standalone and embedded use still share the generator origin as a web origin,
but browser storage partitioning may separate their effective local-storage
contexts. The product must not promise unlock portability across those contexts
without browser evidence.

## 5. D1-Only Storage Decision

D1 is selected as the sole v1 storage product for bounded Email Gate state,
including only the data later authorized by explicit schemas for:

- challenge lifecycle;
- verification lifecycle;
- consent lifecycle;
- bounded abuse-control state;
- retention and deletion reconciliation; and
- non-identifying daily aggregate rows.

KV is not selected. Queues, Durable Objects, Workflows, R2, and external
databases are also not selected. A later stage may reopen this storage decision
only with measured evidence that D1 cannot safely meet a specific bounded
requirement.

D1 must not become a general customer database. It must never receive or store
images, Pattern content, Pattern Matrix data, PNG data, material data, Palette
data, generator settings, Shopify data, or Commerce data.

No database or migration is created by this governance freeze.

D1-only remains conditional on the next schema and security contract proving:

- atomic challenge creation and replacement;
- atomic verification-success transition and attempt counting;
- atomic resend throttling and duplicate-safe Resend retry state;
- safe concurrent challenge issuance and verification;
- unique and conditional constraints where required;
- safe handling of D1 overload, timeout, transaction, and write failure;
- fail-closed behavior when a required state mutation cannot be committed; and
- no naive read-then-modify-in-JavaScript-then-unconditional-update race.

The implementation must use conditional mutation, transaction or batch
semantics, unique constraints, or an equivalently proven atomic design. D1-only
may be reopened only if measured evidence shows that it cannot satisfy the
bounded concurrency and abuse requirements; KV or Durable Objects must not be
added merely for convenience.

## 6. Turnstile and Server-Side Abuse Protection

Cloudflare Turnstile is selected as the browser abuse challenge protecting
email-challenge issuance. The browser supplies a Turnstile token and the Worker
must validate it server-side before treating it as successful abuse proof.
Turnstile does not issue the email verification challenge and does not prove
control of the submitted email address.

Turnstile does not replace server-side controls. The Worker must separately
enforce bounded:

- resend throttling;
- verification-attempt limits;
- endpoint rate limits;
- per-identity or equivalently authorized abuse limits;
- request body size and schema limits; and
- challenge replacement and terminal-failure behavior.

Any derived correlation key requires the separate A01-mandated review of its
derivation, reversibility, secret handling, and retention. Raw email must not be
used as a logging or telemetry key.

Exact numeric limits remain deferred to the next schema and security contract.
The Turnstile widget, sitekey, secret, hostname allowlist, and server validation
are not created by this decision.

## 7. Transactional Email Provider Decision

Resend is selected as the v1 transactional verification-email provider,
conditional on successful account, domain, DNS, security, privacy, and delivery
setup acceptance.

The authorized provider use is limited to one-to-one verification-email
delivery. E04 does not authorize Resend Contacts, Audiences, Broadcasts,
Marketing, Automations, provider-managed marketing consent, or any marketing
email. `marketing_consent_granted`, `marketing_consent_declined`, and
`marketing_consent_not_present` remain distinct.

Production collection or persistence of optional marketing consent remains
disabled until final consent copy, affirmative unchecked-control behavior,
consent version, retention basis, withdrawal and deletion mechanisms,
customer-request handling, privacy notice and data handling, and any future
marketing-provider transfer have been independently accepted. The
verification-only Email Gate may be implemented independently without
collecting marketing consent. Consent must not be collected first with
withdrawal or deletion added later.

The future provider configuration must:

- use a server-only API key;
- use `sending_access`, not full account access;
- restrict the key to the accepted verification sending domain;
- keep open tracking and click tracking disabled;
- use Resend idempotency support for safe send retries;
- keep idempotency identifiers free of raw or reversibly derived email; and
- avoid provider webhooks in initial v1 unless a later stage proves they are
  required.

Resend documents sending-only, domain-restricted API keys, tracking controls,
and 24-hour idempotency-key handling. These facts were retrieved on 2026-08-25
from:

- <https://resend.com/docs/dashboard/api-keys/introduction>
- <https://resend.com/docs/dashboard/domains/tracking>
- <https://resend.com/docs/dashboard/emails/idempotency-keys>

No Resend account, domain, API key, contact, audience, or integration is created
by this decision.

## 8. Sending Domain Direction

The verification sender must use an isolated Poparooz sending subdomain. The
current candidate is:

```text
notify.poparooz.com
```

The exact subdomain and sender address remain subject to setup acceptance.
Resend recommends a subdomain to isolate sending reputation and requires SPF
and DKIM verification; DMARC is a separate DNS/security decision. These facts
were retrieved on 2026-08-25 from:

- <https://resend.com/docs/dashboard/domains/introduction>
- <https://resend.com/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain-or-the-root-domain>

No DNS record is authorized by this decision. Existing root-domain email routing
must not be modified without independent review. Required SPF, DKIM, return-path,
and any DMARC records must be inspected as an exact proposed diff before they
are created.

## 9. One-Time-Code Verification

A one-time code is selected instead of a magic link for v1. The email contains
only the bounded verification message and code. It must contain no source image,
Pattern, Pattern identity, material data, PNG data, generator state, or
customer-specific URL payload.

Poparooz-controlled Worker state and D1 must never persist the raw verification
code. Poparooz may retain only a later-approved safe verifier representation.
Resend necessarily receives the verification-email body containing the
one-time code in order to deliver it, so this contract does not claim that the
raw code is never processed or retained outside Poparooz-controlled storage.
The server-authoritative challenge state, not possession of an old email,
determines whether a code remains usable. The verifier must be invalidated
immediately on:

- successful verification;
- expiry;
- replacement by resend; or
- terminal failure.

Exact code length, verifier construction, expiry, resend interval, attempt
limit, normalization policy, and international-address policy remain deferred
to the next schema and security decision. The selected provider's idempotency
window does not replace the Email Gate challenge expiry or replay-prevention
contract.

## 10. Poparooz Retention Decision

The following retention limits are frozen as governance maxima:

- terminal challenge metadata is retained no longer than 7 days;
- verification-only normalized email is retained no longer than 7 days;
- Poparooz-controlled Worker state and D1 never persist the raw verification
  code;
- a safe verifier representation is invalidated immediately as described
  above;
- verification-only email and challenge records are deleted or irreversibly
  anonymized after the applicable daily aggregate is durably reconciled and the
  bounded operational window has elapsed;
- aggregation failure prevents premature deletion and must not silently lose
  counts;
- reconciliation is idempotent or equivalently duplicate-safe;
- marketing-consented email follows a separate withdrawal and deletion
  lifecycle and is not deleted merely because verification aggregation
  completed; and
- anonymous daily aggregate rows are retained for 24 months, subject to the
  next privacy, operational, and cost review.

The 7-day limit is a maximum, not a default justification for every row.
Implementation must delete data earlier when the authorized operational purpose
has ended and reconciliation is safely complete.

This decision does not freeze a general marketing retention period. Production
collection and persistence of optional marketing consent remain disabled under
the gate in Section 7.

Active business retention, logical deletion or irreversible anonymization, and
D1 Time Travel or point-in-time recovery are separate concepts. Active business
retention means rows available to normal Email Gate application queries.
Logical deletion or anonymization means the application no longer returns or
uses the identity data. Time Travel means an earlier database state may remain
recoverable under Cloudflare's platform recovery window.

Under the official snapshot retrieved on 2026-08-25, D1 Time Travel supports 7
days on Workers Free and 30 days on Workers Paid, is platform-managed, and is
always on for supported production databases. Therefore, deleting a row at the
end of the seven-day business window does not prove that every
Cloudflare-recoverable copy disappeared at that time. A deleted row may remain
recoverable for the then-current Time Travel window.

Before resource creation, the infrastructure stage must decide and document the
D1 jurisdiction or data-location choice. A jurisdiction is selected when the
database is created and cannot later be added or changed. The stage must also
freeze recovery and restore authorization, treatment of restored personal data,
reapplication of expired deletion or anonymization rules after restore,
deletion evidence, Time Travel acceptance, and current platform backup and
recovery behavior. The seven-day Poparooz active-retention value remains a
maximum, not an entitlement to retain every row for seven days.

Official sources retrieved on 2026-08-25:

- <https://developers.cloudflare.com/d1/reference/time-travel/>
- <https://developers.cloudflare.com/d1/configuration/data-location/>

## 11. Provider-Retention Qualification

Poparooz D1 retention does not control copies retained independently by the
transactional email provider.

As of the official information retrieved on 2026-08-25, Resend states that
email and log data is retained for 30 days while an account is active on Free,
Pro, and Scale plans, and that backups persist for 7 days. Its DPA separately
describes account-termination deletion and other provider-controlled
processing. Sources:

- <https://resend.com/security/gdpr>
- <https://resend.com/legal/dpa>

Therefore, this contract must not claim that all email-address, message, or log
copies disappear within Poparooz's 7-day D1 window. The provider retention,
subprocessors, region, account deletion, support access, exports, logs, and
exception-capture defaults require final privacy acceptance before production.

Provider-retained copies of an old verification email must be unable to
complete verification after successful verification, expiry, resend
replacement, terminal failure, or any other challenge invalidation. Provider
retention does not prove that a code remains usable; validity is controlled by
the server-authoritative challenge state. Poparooz D1 deletion cannot delete or
control Resend copies.

Disabling open and click tracking reduces optional engagement collection but
does not eliminate the provider's delivery data or contractual retention.

## 12. Aggregate Semantics

Daily consent-related aggregates must preserve three separate categories:

```text
marketing_consent_granted
marketing_consent_declined
marketing_consent_not_present
```

`not_present` must never be relabeled or counted as `declined`. Long-term rows
contain counts only, with no raw or normalized email, reversible email-derived
identifier, challenge, IP-address list, image, Pattern, or customer-level row.

ChatGPT reports, Gmail summaries, Analytics, and an Ops Dashboard remain future,
separately authorized, aggregate-only consumers. They do not execute or control
verification, aggregation, retention, deletion, or consent withdrawal.

No analytics, scheduled reporting, ChatGPT reporting, Gmail reporting, or Ops
Dashboard is implemented or authorized by this decision.

## 13. Current Cost and Limit Snapshot

The values below are externally verified inputs retrieved from official sources
on 2026-08-25. They are not contractual guarantees and must be rechecked before
production activation.

| Service              | Current free snapshot                                                                                                                                          | Official source                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Cloudflare Workers   | 10 ms CPU per HTTP or Cron invocation; 100,000 requests/day; 5 Cron Triggers/account; 50 external and 1,000 Cloudflare-internal-service subrequests/invocation | <https://developers.cloudflare.com/workers/platform/limits/> |
| Cloudflare D1        | 5 million rows read per day; 100,000 rows written per day; 5 GB total storage                                                                                  | <https://developers.cloudflare.com/d1/platform/pricing/>     |
| Cloudflare Turnstile | Free plan; no fixed per-challenge charge; unlimited challenges under the current plan table                                                                    | <https://developers.cloudflare.com/turnstile/plans/>         |
| Resend               | 3,000 emails per month; 100 emails per day                                                                                                                     | <https://resend.com/pricing>                                 |

The expected incremental fixed provider subscription cost is `$0/month` only
while the account remains eligible for these free plans and all usage stays
within their then-current limits. This excludes existing domain and Cloudflare
zone costs, taxes, optional paid features, support, overages, and any later
required upgrade. It is not a price guarantee.

D1 row usage is affected by query plans and index writes, so request count must
not be treated as equivalent to D1 row count. All provider pricing, plan limits,
execution limits, storage limits, retention terms, and relevant platform
constraints must be rechecked against current official documentation before any
production-intended Worker, D1 database, Turnstile resource, Resend
account/domain configuration, DNS record, secret, Cron Trigger, or equivalent
infrastructure resource is created, and must be rechecked again before
production activation. This gate does not prohibit exploratory account login or
documentation review.

Before production, actual measurement is required for verifier construction and
comparison, request and schema validation, Turnstile validation orchestration,
D1 transactions, Resend request and response handling, aggregate
reconciliation, and scheduled cleanup. Network and storage wait time must not be
confused with CPU measurement. The 15-minute Cron wall-time ceiling is separate
from the 10 ms Workers Free CPU limit per Cron invocation.

Security, replay protection, verifier strength, validation, throttling,
deletion safety, and privacy controls must never be weakened merely to remain
within a Free limit. If the secure design cannot operate reliably within the
then-current Free limits, the project must review Workers Paid, another bounded
architecture, or a revised operational schedule. `$0/month` remains a
conditional target, not a guaranteed outcome.

If Worker, D1, Turnstile, or Resend capacity is unavailable or exhausted, a
locked browser receives a safe retry-later result and remains locked. Quota
exhaustion must never bypass verification. The Worker Route must use a
fail-closed security posture. An already valid local unlock marker continues to
permit the existing local PNG download without a backend request, as frozen by
A01.

## 14. Rejected v1 Alternatives

These alternatives are rejected for v1, not permanently prohibited:

| Alternative                                                     | v1 decision reason                                                                                                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages Functions plus a dedicated scheduled Worker               | Adds two backend composition models and requires reopening the repository's static Pages boundary. The selected single Worker can own both `fetch()` and `scheduled()` while leaving Pages static. |
| Separate cross-origin Worker API                                | Adds an API hostname, CSP expansion, CORS/preflight policy, preview-origin configuration, additional DNS, and a broader rollback boundary without a demonstrated v1 benefit.                       |
| Migrate the complete Pages application to Workers Static Assets | Changes the accepted static hosting and deployment architecture far beyond the bounded Email Gate need. The selected path leaves existing Pages assets and application routes unchanged.           |

The selected Worker Route must still prove narrow route coexistence, fail-closed
quota behavior, rollback, and isolation from Pages assets. Selection is not
deployment evidence.

## 15. Repository Consequences for a Later Implementation

A separately authorized implementation will require deliberate additions or
changes including:

- a bounded Worker source directory outside the browser generation runtime;
- repository-owned Wrangler configuration for the standalone Worker;
- exact production and preview environments;
- D1 migrations and migration verification;
- Worker-specific request, security, storage, provider, retention, and schedule
  tests;
- server-only D1, Turnstile-secret, and Resend-key bindings;
- explicit `.dev.vars*` ignore protection before any local secret file exists;
- deliberate revision of the current static-hosting boundary test, which now
  prohibits Workers and Wrangler configuration;
- explicit narrow Worker Route, no-Custom-Domain selection, alternate-endpoint
  controls, and fail-closed configuration;
- Worker-owned API response security, exact JSON content-type, cache prevention,
  and `Cache-Control: no-store` headers; Pages `public/_headers` must not be
  assumed to apply to Worker-generated responses;
- request-body logging prohibition and platform/provider log review;
- separate Worker deployment, version, rollback, and remote verification; and
- proof that the existing Pages build, CSP, iframe, local PNG, and browser-only
  generation paths remain unchanged.

Server-only modules must not import the Pattern generation runtime or create a
network dependency in upload, decoding, background removal, quantization,
matching, Pattern assembly, Results, or PNG generation.

No repository consequence listed above is implemented by this decision.

## 16. Secrets, Logging, and Response Boundary

Future provider keys, Turnstile secrets, verifier secrets, and D1 bindings are
server-only. They must never use `VITE_*`, enter the browser bundle, appear in
URLs, or be sent through iframe messages.

The Resend key must be least privilege, sending-only, and restricted to the
approved domain. Production and preview secrets must remain separate. Before
production, each secret requires an initial-provisioning review, documented
rotation and revocation procedures, a suspected-exposure incident procedure,
removal of superseded keys, and remote verification that old keys no longer
work. No secret, account ID, zone ID, database ID, sitekey, or DNS value belongs
in this decision document.

The Worker and provider setup must prevent raw or normalized email, request
bodies, one-time codes, verifier representations, Turnstile tokens, and
challenge identifiers from entering:

- application or access logs where configuration can prevent or redact them;
- traces;
- exceptions;
- monitoring breadcrumbs;
- analytics;
- URLs; or
- customer-facing or internal error payloads.

Arbitrary operational metadata must likewise contain no raw or normalized
email, code, verifier, Turnstile token, challenge identity, or request body.
Every endpoint must return a bounded provider-neutral response and set its own
security, cache, exact `Content-Type`, and `Cache-Control: no-store` headers.
Pages `public/_headers` must not be assumed to govern Worker API responses.

Before implementation, Cloudflare and Resend defaults for logs, traces,
exception capture, request capture, exports, retention, support access, and
redaction must pass a focused provider audit. Safe bounded error categories are
allowed only when they contain no submitted secret, email, or generator
content.

Current Cloudflare documentation retrieved on 2026-08-25 states that newly
created Workers have observability enabled by default and that invocation logs
may contain request metadata, errors, and uncaught exceptions. Before
production, the actual Worker configuration must explicitly review and accept
invocation logging, URL logging, exception capture, request and response
metadata, tracing, monitoring breadcrumbs, sampling, persistence, retention,
redaction, and export destinations. Platform defaults must not be accepted
blindly. Privacy-safe, bounded operational logging is permitted only when it
proves that no raw email, code, secret, or reversible identity enters logs or
telemetry.

The actual Cloudflare and Resend provider-default audit remains unperformed.
Production is blocked until account and platform settings are reviewed for
logging, request capture, exception capture, tracing, message and delivery
retention, backups, support access, subprocessors, region or jurisdiction,
exports, redaction, deletion, and incident response. This conditional provider
direction is not final production acceptance.

Official source retrieved on 2026-08-25:

- <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>

## 17. Explicit Exclusions

This decision does not authorize:

- server-side image, Pattern, material, Palette, browser Worker, or PNG handling;
- image, Pattern, PNG, or generator-state upload;
- raw email in browser persistence, iframe messages, Analytics, ChatGPT, Gmail,
  URLs, logs, traces, exceptions, or breadcrumbs;
- account, password, Shopify login, Shopify Admin API, order, inventory, cart,
  or Commerce changes;
- a general customer database;
- Pages Functions;
- KV, Queues, Durable Objects, Workflows, R2, or an external database;
- provider marketing-contact synchronization;
- scheduled ChatGPT or Gmail reporting;
- Analytics or Ops Dashboard implementation; or
- changes to Pattern Matrix, processing, Quantizer, Matcher, Generation Palette,
  Generation Color Sets, `PublicPatternResult`, material authority,
  `DerivedMaterialRequirementV1`, PNG rendering, Board Layout, or the browser
  generation Worker.

## 18. Unresolved Decisions and Next Gate

The next schema and security decision must freeze at least:

- exact API routes and request/response schemas;
- email normalization and international-address policy;
- code length and safe verifier construction;
- challenge expiry, resend interval, attempts, rate limits, and terminal states;
- Turnstile hostname, token-validation, replay, and failure behavior;
- D1 schema, indexes, migrations, transactions, aggregate reconciliation, and
  deletion proof;
- D1 atomicity, conditional mutation, concurrency, overload, and fail-closed
  mutation behavior;
- D1 jurisdiction, Time Travel acceptance, restore authorization, and
  post-restore deletion reconciliation;
- marketing-consent withdrawal and deletion mechanics;
- production/preview separation and exact origin allowlists;
- production Workers Route inventory, base-path coverage, specificity,
  fail-closed mode, rollback, and alternate-endpoint controls;
- Worker-owned security, exact JSON content-type, and `no-store` response
  headers;
- provider and Cloudflare logging/default-retention acceptance;
- server-secret provisioning, rotation, revocation, and incident response;
- sending-domain and DNS diff acceptance;
- Worker deployment, route, fail mode, monitoring, and rollback; and
- quota monitoring and customer-safe exhaustion behavior.

Production implementation remains blocked pending the actual provider/account
audit, the separately authorized schema and security decision, and satisfaction
of all A01 implementation-entry gates.

## Git Baseline

```text
branch: main
A02-A01 entry HEAD: 36b529fecba2af108560a37c68e3afe450667f0a
A02-A01 entry origin/main: 36b529fecba2af108560a37c68e3afe450667f0a
ahead / behind: 0 / 0
worktree at entry: clean
```

## Decision

```text
A02 PROVIDER / TOPOLOGY / RETENTION DECISION FROZEN
```

Production code and behavior remain unchanged. No Worker, D1 database,
Turnstile widget, Resend account/domain/key, DNS record, analytics, scheduled
aggregation, report, or Ops Dashboard has been created.
