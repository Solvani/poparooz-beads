# Poparooz P3-A03-E04-A02-A02 Schema, Security, and API Contract

Stage: `P3-A03-E04-A02-A02-A01`

Status: **A02-A02 SCHEMA / SECURITY / API CONTRACT FROZEN / PRODUCTION IMPLEMENTATION NOT STARTED**

This is a frozen documentation and governance contract. The freeze does not
implement or authorize production code, an API, infrastructure, provider
resources, deployment, analytics, or reporting.

## 1. Authority and Scope

The frozen authorities remain:

- [`POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md`](POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md);
  and
- [`POPAROOZ_P3_A03_E04_A02_PROVIDER_TOPOLOGY_RETENTION_DECISION.md`](POPAROOZ_P3_A03_E04_A02_PROVIDER_TOPOLOGY_RETENTION_DECISION.md).

The preceding read-only audit concluded:

```text
A02-A02-A00 SCHEMA / SECURITY AUDIT PASSED / READY FOR CONTRACT DECISION
```

This contract freezes the v1 API, schema, challenge, concurrency, security,
retention, and testing decisions. It preserves all frozen A01 and A02-A01
product, privacy, topology, provider, and production boundaries. It does not
create or activate the Email Download Gate.

## 2. API Surface

The frozen v1 surface contains exactly two conceptual HTTP operations:

```text
POST /api/email-gate/v1/challenges
POST /api/email-gate/v1/verifications
```

Calling `POST /api/email-gate/v1/challenges` again for the same normalized email
is a new issuance or replacement request. It remains subject to cooldown,
Turnstile, rate limits, pending-delivery recovery, and atomic replacement
semantics. There is no separate resend endpoint.

The v1 surface does not include an unlock-status, session, login, account,
logout, download, marketing, or customer endpoint. The backend is not a browser
session authority. A valid current-version local unlock marker continues to
bypass the backend.

## 3. Request Contracts

Requests use strict, versioned Zod schemas and reject unknown keys.

`POST /api/email-gate/v1/challenges` uses this exact strict object:

```ts
{
  schemaVersion: 1,
  email: string,
  turnstileToken: string
}
```

`schemaVersion` is the literal integer `1`. `email` is a string that must pass
the exact v1 normalization and validation contract in Section 6; no
implementation may treat the raw input as already normalized.

`turnstileToken` is an opaque string of 1 through 2,048 characters. It is not
trimmed, lowercased, or normalized, is never logged, and is passed only to the
bounded server-side Turnstile adapter. The 2,048-character limit comes from the
reviewed Cloudflare Turnstile documentation snapshot and must be rechecked before
production activation.

`POST /api/email-gate/v1/verifications` uses this exact strict object:

```ts
{
  schemaVersion: 1,
  challengeId: string,
  code: string
}
```

`schemaVersion` is the literal integer `1`. `challengeId` must match exactly:

```regex
^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

Uppercase UUID forms are rejected. `code` must match exactly:

```regex
^[0-9]{8}$
```

Neither field is trimmed or coerced. Both request objects reject unknown keys.

Both operations are `POST` requests with media type `application/json`. The
maximum request body is 4,096 bytes, enforced before unrestricted parsing.
There is no arbitrary metadata field.

Requests must never accept an image, filename, Pattern, Pattern identity,
Pattern Matrix, PNG, materials, Palette, generation Worker state, Shopify data,
cart, order, inventory, or marketing consent.

## 4. Response Contracts

Responses use strict, versioned, provider-neutral discriminated unions. Every
response is an exact object that contains `schemaVersion: 1`, contains exactly
one `result` discriminator, rejects unknown keys, and contains no provider or
internal identifier.

Issue success uses HTTP `201`:

```ts
{
  schemaVersion: 1,
  result: "challenge_issued",
  challengeId: string,
  expiresInSeconds: integer,
  resendAfterSeconds: integer
}
```

Verification success uses HTTP `200`:

```ts
{
  schemaVersion: 1,
  result: "verification_succeeded",
  verified: true
}
```

`expiresInSeconds` is the actual positive remaining server-authoritative
lifetime when the response is constructed, not a fixed 600-second value after
provider latency. `resendAfterSeconds` is the actual remaining new-issuance
cooldown only; it does not promise that a later request will pass rolling
per-email limits, Turnstile, global capacity, provider, or service gates.

Failure bodies are exactly:

```ts
// HTTP 400
{ schemaVersion: 1, result: "invalid_request" }
{ schemaVersion: 1, result: "version_unsupported" }

// HTTP 409
{ schemaVersion: 1, result: "verification_invalid" }
{ schemaVersion: 1, result: "verification_expired" }
{ schemaVersion: 1, result: "verification_locked" }

// HTTP 429
{ schemaVersion: 1, result: "retry_later" }

// HTTP 503
{ schemaVersion: 1, result: "service_unavailable" }
```

The closed operation matrix is:

| Operation                               | Allowed status/result                                                                                                                                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/email-gate/v1/challenges`    | `201 challenge_issued`, `400 invalid_request`, `400 version_unsupported`, `429 retry_later`, `503 service_unavailable`                                                                                          |
| `POST /api/email-gate/v1/verifications` | `200 verification_succeeded`, `400 invalid_request`, `400 version_unsupported`, `409 verification_invalid`, `409 verification_expired`, `409 verification_locked`, `429 retry_later`, `503 service_unavailable` |

Any other status/result pair is invalid and remains locked. The bounded failure
categories are:

| HTTP | Failure category                                                      |
| ---: | --------------------------------------------------------------------- |
|  400 | `invalid_request`, `version_unsupported`                              |
|  409 | `verification_invalid`, `verification_expired`, `verification_locked` |
|  429 | `retry_later`                                                         |
|  503 | `service_unavailable`                                                 |

`retryAfterSeconds` is not part of any v1 failure object. Exact internal
throttling and provider quota state are not exposed.

Responses must not expose provider names or errors, provider request IDs,
internal D1 row IDs, raw or normalized email, exact attempt counters, exact
quota state, Turnstile internals, stack traces, or secret values.

## 5. Browser Response Gate

No response may advance Email Gate state unless all of these checks pass:

- no redirect occurred;
- the HTTP status is expected for the operation;
- the response has the exact supported JSON media type;
- the response body is no larger than 4,096 bytes;
- `schemaVersion` is supported;
- strict Zod response parsing passes;
- the result is valid for the current operation;
- the response belongs to the still-current browser operation; and
- the lifecycle transition is allowed.

Pages HTML, SPA fallback, Cloudflare or provider HTML, `404`, `405`, redirects,
malformed or oversized JSON, unsupported versions, unknown fields, invalid
status/body pairs, network failures, timeouts, and quota failures all remain
locked.

`POST /api/email-gate/v1/challenges` has no server-side client-request ID. The
browser maintains one memory-only local issuance-operation generation token or
equivalent in-flight identity. It is never sent to the server, never persisted,
and contains no email or Pattern identity. A newer issuance action supersedes
the older local request; any older response is ignored and its `challengeId`
cannot replace the newer browser context. A valid current `201` response makes
its `challengeId` current only when it belongs to the still-current local
issuance operation.

## 6. Email Normalization v1

The frozen v1 policy is deliberately conservative, deterministic, and
ASCII-only. Client and Worker share the same pure normalization contract.

Trim only leading and trailing ASCII SPACE (`0x20`) and HTAB (`0x09`). After
trimming, reject any non-ASCII character, CR, LF, NUL, ASCII control, DEL, or
whitespace. Exactly one `@` separator is required.

The local part is 1 through 64 ASCII bytes and must match this normative regex:

```regex
^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$
```

This is one or more ATEXT characters, optionally followed by one or more `.`
plus one or more ATEXT characters. The normative regex above lists the complete
ATEXT set: ASCII letters, digits, and the permitted punctuation. Leading,
trailing, and consecutive dots, quoted local parts, comments, and internal
whitespace are rejected.
Local-part bytes and case are preserved exactly. Dots and plus tags are not
removed, and no Gmail/provider alias normalization occurs.

The domain is lowercased as ASCII before validation, is 1 through 253 ASCII
bytes, and contains at least two DNS labels separated by `.`. A trailing root
dot, empty label, underscore, and single-label domain are rejected. Each label
is 1 through 63 bytes and matches:

```regex
^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$
```

Labels cannot begin or end with a hyphen. Labels beginning with `xn--` and raw
Unicode domains are rejected in v1 rather than being treated as validated IDNA
or A-label input.

The complete normalized address is no more than 254 ASCII bytes. IDNA,
internationalized-domain, SMTPUTF8, and EAI support remain deferred to a later
separately authorized version.

## 7. OTP and Challenge Identity

The frozen v1 verification value is an eight-digit numeric one-time code with
a 600-second lifetime and a maximum of five verification attempts per
challenge.

Security identities use `crypto.getRandomValues()`, `crypto.randomUUID()`, or an
equivalently secure source. `Math.random()` is prohibited for security state.

`challengeId` is opaque, cryptographically random, non-sequential,
non-email-derived, and free of customer, image, and Pattern information. It
contains at least 128 bits of randomness. It is public state, not the
verification credential.

## 8. Deterministic OTP Derivation

The normative algorithm identifier is `POPAROOZ_EMAIL_GATE_OTP_V1`. It uses
HMAC-SHA-256 and the server-only key selected by `otpKeyVersion`. The
`challengeId` is a canonical lowercase UUID string matching
`xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`, encoded as exactly 36 ASCII bytes.

For an unsigned 32-bit counter starting at zero, construct:

```text
message =
  ASCII("poparooz-email-gate:otp:v1")
  || 0x00
  || ASCII(canonicalChallengeId)
  || 0x00
  || UINT32_BE(counter)

digest = HMAC-SHA-256(key, message)
candidate = UINT32_BE(digest bytes 0..3)
```

The decimal space is `N = 100000000`. The rejection threshold is:

```text
T = floor(2^32 / N) * N = 4200000000
```

If `candidate >= 4200000000`, reject the block, increment the counter, and
derive again. If `candidate < 4200000000`, compute
`otpInteger = candidate mod 100000000` and render the decimal integer left-padded
with ASCII `0` to exactly eight characters. Direct `uint32 % 100000000` without
threshold rejection is prohibited.

Counters 0 through 15 inclusive are allowed. If none produces an accepted
candidate, fail closed with `service_unavailable` and send no email. The raw or
derived OTP is never persisted.

Submitted code must first match `^[0-9]{8}$`. Re-derive the expected eight-byte
ASCII OTP and compare the two equal-length ASCII byte arrays with the documented
`crypto.subtle.timingSafeEqual()` Workers primitive or an independently verified
equivalent. Ordinary string equality is not the authoritative secret comparison.
This does not claim that surrounding application execution is perfectly
constant-time; runtime compatibility testing remains mandatory.

### Normative non-secret test vectors

The public test key bytes are:

```text
000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
```

They are documentation/test material and must never be used as a production
key.

| Vector          | Challenge ID                           | Counter candidate(s)                                      | Expected OTP |
| --------------- | -------------------------------------- | --------------------------------------------------------- | ------------ |
| A               | `00000000-0000-4000-8000-000000000000` | counter 0: `1983480293`                                   | `83480293`   |
| B, leading zero | `00000000-0000-4000-8000-000000000008` | counter 0: `3009571651`                                   | `09571651`   |
| C, rejection    | `00000000-0000-4000-8000-000000000026` | counter 0: `4211631933` rejected; counter 1: `2744124779` | `44124779`   |

Vector C rejects counter zero because `4211631933 >= 4200000000`. Worker tests
must reproduce every vector exactly.

Actual secret bytes are not frozen. Database disclosure without the server key
must not reveal the OTP. The derivation design is frozen by this contract.

## 9. OTP Key Versioning

Two independent immutable registries are required: an OTP key registry keyed by
`otpKeyVersion`, and a delivery payload renderer/configuration registry keyed by
`deliveryPayloadVersion`. New challenges use only the newest approved versions.

A normal deployment must not remove or mutate a key version or payload renderer
while any non-expired eligible `delivery_pending` or `active` challenge can
reference it. Old versions become removable only after no challenge can legally
verify with them or retry provider delivery with them. If an eligible challenge
references a missing key or renderer, fail closed with `service_unavailable`.
Never substitute a newer key, template, or renderer under an existing challenge
or provider idempotency key.

Suspected compromise permits invalidating affected active and pending
challenges, revoking the key, and requiring customers to request a new code.
Production and preview use separate keys. No OTP key uses a `VITE_*` variable.

## 10. Challenge State Machine

The internal lifecycle is:

```text
delivery_pending
active
verified
expired
superseded
terminal_failed
delivery_failed
```

Only `active` challenges may verify. Required transitions are:

- `delivery_pending -> active` only after provider acceptance is established;
- `active -> verified` only through one atomic successful verification;
- `active -> terminal_failed` after the fifth unsuccessful attempt;
- `active | delivery_pending -> expired` when `expiresAt` is reached;
- `active -> superseded` only when the replacement challenge activates; and
- `delivery_pending -> delivery_failed` on definitive provider rejection or
  terminal provider-attempt failure.

The prior active challenge remains authoritative while its replacement is
`delivery_pending`. Delivery failure must not invalidate the prior active
challenge. Every terminal state makes the OTP unusable, and a stale
`challengeId` can never unlock a newer challenge.

For one normalized email, there may be at most one `active` challenge and at
most one eligible `delivery_pending` challenge. One active challenge and one
replacement pending challenge may coexist, but two eligible pending challenges
for the same normalized email are prohibited. Two concurrent challenge requests
must never produce two independent pending email codes.

## 11. Provider Send and Idempotency

Each new challenge issuance event receives a `providerSendEventId`.
`providerSendEventId` is a cryptographically random, opaque, non-sequential
identifier. Opaque means that no consumer may infer or encode customer, email,
challenge, provider-account, Pattern, business, timestamp, sequence, or other
semantic meaning from the identifier value itself. It must not be parsed for
business logic, contain encoded email or challenge identity, contain timestamps
or counters, or be displayed to customers. It remains the stable Resend
idempotency-event identity. The logical Resend idempotency key is:

```text
poparooz-email-gate/v1/<providerSendEventId>
```

It contains no email. Store only the fields required by this contract, including
`providerSendEventId`, `deliveryPayloadVersion`, and `providerAttemptCount`.
Do not store Resend provider IDs unless a later operational review proves them
necessary.

`deliveryPayloadVersion` identifies one immutable provider-request renderer.
Once referenced, its semantics cannot change in place. It freezes at least:

- exact sender/from value;
- recipient transformation, using stored `normalizedEmail` exactly;
- exact subject;
- exact text body rendering;
- exact HTML body rendering if HTML is enabled;
- OTP formatting, newline rules, and character encoding;
- the exact provider request fields; and
- presence or omission of every optional provider field.

Initial v1 has no attachment, tag, scheduled send, or marketing field. A change
to sender, template, or provider request semantics creates a new
`deliveryPayloadVersion`. Old renderers remain available while an eligible
pending event references them. Retrying one `providerSendEventId` reconstructs
the same logical Resend request values; an existing idempotency key is never
retried with an edited template. Provider idempotency duration is provider
behavior, not OTP lifetime.

## 12. Provider Ordering and Retry

After strict normalization and request parsing and successful fresh Turnstile
validation, `POST /api/email-gate/v1/challenges` applies a server-authoritative
issue/recovery decision.

If one eligible pending challenge exists, do not create another challenge. The
request is same-event recovery and may retry the existing event only when:

- `state == delivery_pending`;
- `now < expiresAt`;
- `providerAttemptCount < 3`;
- no unexpired provider-attempt lease exists; and
- all same-event retry timing rules pass.

Recovery reuses `challengeId`, `providerSendEventId`, `otpKeyVersion`,
`deliveryPayloadVersion`, idempotency key, deterministic OTP, provider payload,
and global send reservation. Client data never selects provider state.

An expired pending event is atomically transitioned to `expired` before another
event can be created. A pending event with exhausted provider attempts becomes
`delivery_failed`. Only after the prior pending event is no longer eligible may
a later request create a new issuance event, subject to every normal limit. A
fresh Turnstile token is required for both new issuance and customer-triggered
same-event recovery; it authorizes the browser action but does not create a
second pending event.

Creation of a new pending event atomically proves that:

- no eligible pending row exists for `normalizedEmail`;
- the 60-second new-event cooldown passes;
- fewer than three new events exist in the rolling prior 30 minutes;
- fewer than six new events exist in the rolling prior 24 hours; and
- one global new-send reservation is acquired.

The same D1 transaction creates the pending challenge and its global send
reservation. Failure of any condition creates neither record and makes no
provider call. Concurrent callers cannot both pass stale reads.

For a new event, `createdAt` is the server timestamp committed with the pending
challenge, and:

```text
expiresAt = createdAt + 600 seconds
```

OTP validity begins at challenge creation, not provider acceptance. Provider
latency and ambiguous retry time intentionally reduce customer-usable validity.
A pending event never activates when `now >= expiresAt`, even if a delayed
provider response reports success.

Before every external Resend call, including the first, atomically reserve one
provider attempt. The conditional mutation requires `state == delivery_pending`,
`now < expiresAt`, `providerAttemptCount < 3`, and no still-valid attempt lease.
It increments `providerAttemptCount`, sets `lastProviderAttemptAt`, and sets:

```text
providerAttemptLeaseUntil = reservation timestamp + 15 seconds
```

The 15-second lease intentionally exceeds the eight-second external timeout.
Exactly one row must be affected. Zero rows means no provider request and a
fail-closed `retry_later` or `service_unavailable` response. A second Worker
cannot send the same event while the lease is valid.

The provider outcome rules are:

- definite acceptance or valid idempotent replay: atomically supersede the prior
  active challenge and activate exactly the intended pending replacement;
- definite rejection: transition to `delivery_failed` without invalidating the
  prior active challenge;
- ambiguous timeout/network failure: remain `delivery_pending`;
- concurrent-idempotency conflict: remain ambiguous/retryable, create no new
  event, and do not activate from that response alone; and
- changed-payload idempotency conflict: internal integrity failure, fail closed,
  and do not switch idempotency key.

After an ambiguous result, a later fresh customer action may retry the same event
after the lease expires. If all three attempts are consumed without authoritative
acceptance, transition to `delivery_failed`. Old provider email copies are
non-authoritative unless the corresponding challenge reached `active`.

On a valid `201 challenge_issued` response, the remaining lifetime is:

```text
expiresInSeconds = max(1, ceil((expiresAt - responseNow) / 1000))
```

Never return `201` when `expiresAt <= responseNow`. `resendAfterSeconds` is
computed in integer seconds from the same response timestamp:

```text
minimumNewIssuanceAllowedAt = createdAt + 60 seconds
resendAfterSeconds =
  max(0, ceil((minimumNewIssuanceAllowedAt - responseNow) / 1000))
```

Do not floor or return a negative value.

A D1 failure after provider acceptance remains fail closed and recovers using
the same pending event, provider-attempt state, idempotency identity, and global
send reservation.

Resend idempotency does not make D1 and Resend one transaction.

The frozen v1 external Resend timeout is eight seconds. One
`providerSendEventId` permits at most three atomically reserved provider attempts.
Retries use the same send event, idempotency key, and logically identical
payload, and are allowed only while the challenge is `delivery_pending` and
unexpired.

No scheduled or background Worker automatically sends verification email.
Retries occur only on a later valid customer issuance action. An ambiguous
timeout returns a provider-neutral `retry_later` or `service_unavailable` result
and remains locked.

## 13. Turnstile Contract

Every new issuance or replacement requires a fresh Turnstile token. The server
calls Siteverify and validates the expected production hostname and action. The
candidate action is:

```text
email_gate_issue_v1
```

Missing, invalid, expired, replayed, hostname-mismatched, action-mismatched,
timed-out, or unavailable validation fails closed: no email is sent and no
challenge is activated. The frozen v1 validation timeout is five seconds. An
ambiguous or consumed token is not automatically retried; the customer obtains
a fresh token.

Turnstile is neither proof of email ownership nor a replacement for email and
server-side rate limits.

## 14. Numeric Abuse and Quota Decisions

The frozen v1 values are:

| Control                                  | Value                    |
| ---------------------------------------- | ------------------------ |
| OTP length                               | 8 numeric digits         |
| OTP lifetime                             | 10 minutes               |
| Wrong-code attempts                      | 5 per challenge          |
| New challenge-send cooldown              | 60 seconds               |
| New issuance events per normalized email | 3 per rolling 30 minutes |
| New issuance events per normalized email | 6 per rolling 24 hours   |
| Provider attempts per send event         | 3                        |

A **new issuance event** exists and counts when the atomic creation transaction
commits a new `delivery_pending` challenge together with its global send
reservation. Its authoritative counting timestamp is `challenge.createdAt`.

Once committed, the event counts toward the 60-second cooldown, rolling
three-per-30-minute limit, and rolling six-per-24-hour limit regardless of later
provider acceptance, rejection, timeout, `delivery_failed`, expiry,
supersession, verification, or `terminal_failed` state. A rolled-back
transaction that creates no challenge does not count. A same-event provider
retry does not count as a new issuance event.

For a request evaluated at server time `now`, the exact rolling boundaries are:

```text
cooldown blocks rows with createdAt > now - 60 seconds
30-minute window counts rows with createdAt > now - 1800 seconds
24-hour window counts rows with createdAt > now - 86400 seconds
```

An event exactly on a lower boundary is outside that rolling window.

Initial v1 stores no raw IP and uses no network-derived abuse key. If production
evidence later shows that Turnstile and per-email limits are insufficient, a
separately authorized privacy/security stage may add a bounded network-derived
key.

Because local-part case is preserved, `Example@domain.com` and
`example@domain.com` are different normalized identities in v1. This is a known
abuse-control limitation. The local part must not be silently lowercased;
Turnstile and the global rolling reservation ceiling provide additional
containment. Any future case-insensitive abuse identity or provider-aware
canonicalization requires separate derivation and privacy review.

The Poparooz internal v1 global rule is at most 90 **new-send reservations** in
any rolling prior 24-hour interval. This does not claim knowledge of Resend's
quota reset timezone, window, or accounting semantics, which remain a production
provider-acceptance gate. The value must be rechecked before resource creation
and production activation and must remain no higher than 90% of the then-current
applicable provider new-send allowance, or be separately reviewed.

Same-event provider retries reuse the original logical reservation and do not
create another. Actual provider accounting of idempotent retry calls remains
independently subject to provider acceptance. Exhaustion returns `retry_later`,
remains locked, and never bypasses verification. An existing valid local marker
remains unaffected.

## 15. D1 Logical Schema

This contract freezes a logical schema, not SQL migrations.

Primary table: `email_gate_challenges`.

Minimum logical fields:

```text
challengeId
normalizedEmail
state
otpKeyVersion
providerSendEventId
deliveryPayloadVersion
providerAttemptCount
providerAttemptLeaseUntil nullable
attemptCount
predecessorChallengeId nullable
createdAt
expiresAt
activatedAt nullable
verifiedAt nullable
terminalAt nullable
lastProviderAttemptAt nullable
reconciledAt nullable
reconciliationVersion nullable
deletionEligibleAt nullable
rowVersion
```

The table stores no raw OTP, Pattern/image/PNG/customer-commerce data, marketing
field, or marketing table.

The second long-term table is `email_gate_daily_aggregates`. It contains only
anonymous numeric counts and no customer identity, challenge ID, email, IP, or
provider ID.

`email_gate_send_reservations` contains bounded operational linkage data. Its
allowlisted fields are:

```text
providerSendEventId
reservedAt
expiresAt
```

It contains no direct email, `challengeId`, IP, or customer-profile field.
However, the opaque `providerSendEventId` also exists on the related challenge
row and is therefore pseudonymous and joinable to customer-level challenge state
while that state exists. Opaque does not mean anonymous. It is not anonymous,
intrinsically non-identifying, or a permitted long-term reporting identifier.

Each new issuance event acquires exactly one reservation in the same atomic
transaction that creates the pending challenge. `expiresAt = reservedAt + 24
hours`. A reservation counts only when `reservedAt <= now < expiresAt`. The
database operation atomically proves that fewer than 90 counting reservations
exist and inserts the new reservation. Exactly one inserted row means capacity
acquired; zero means `retry_later`, no challenge creation, and no provider call.

Same-event retries reuse the existing `providerSendEventId` reservation. For
conservative v1 behavior, a reservation is not released early after provider or
local failure; it expires naturally after 24 hours. This sacrifices capacity to
avoid ambiguous release races.

At `now >= expiresAt`, the reservation stops consuming global capacity and
becomes immediately deletion-eligible. The hourly scheduled cleanup deletes
expired reservations in bounded retry-safe batches on the first successful
applicable run. Under normal hourly cleanup, active Poparooz-controlled retention
should not exceed approximately 25 hours from `reservedAt`. If cleanup is
unavailable, the expired row remains non-counting, is deleted when cleanup
resumes, and prolonged failure is an operational/privacy incident condition; it
never justifies indefinite retention. D1 Time Travel remains a separate recovery
qualification and this does not claim immediate disappearance from recovery
history.

## 16. D1 Indexes and Invariants

The later migration must prove:

- unique `challengeId`;
- unique `providerSendEventId`;
- efficient `normalizedEmail + time` lookup;
- efficient `state + expiry` lookup; and
- efficient reconciliation/deletion due lookup;
- unique reservation `providerSendEventId`; and
- efficient unexpired send-reservation lookup.

There must never be more than one authoritative active challenge for one
normalized email and never more than one eligible pending challenge for one
normalized email. Partial unique indexes may be used only if validated under
actual D1 tests; another atomic database design must prove both invariants. If
D1 cannot prove them in Worker-runtime integration tests, production remains
blocked and the D1-only decision must be reopened. A `SELECT` result must never
be assumed current during a later write.

## 17. D1 Atomicity and Concurrency

Security state must not use:

```text
SELECT
-> JavaScript state mutation
-> unconditional UPDATE
```

Mutations are conditional on the expected `challengeId`, state, expiry, and,
where required, `rowVersion` or `attemptCount`. Success requires exactly one
affected or returned row. Zero changed rows indicates stale state, a race, or
lost authority and fails closed.

Multi-row replacement uses a transactional batch or equivalently proven atomic
D1 behavior. Superseding the prior active challenge and activating the new
`delivery_pending` challenge commit together or neither occurs. Double
verification must be impossible.

New issuance creation, the pending-authority check, all per-email cooldown and
rolling-window checks, and insertion of the global send reservation commit as
one atomic unit. With 89 unexpired reservations, concurrent issuances can create
at most one new reservation. Every provider-attempt lease is also acquired by a
conditional exactly-one-row mutation before the external provider call.

Verification strictly parses the request, looks up the challenge, derives the
expected OTP using `otpKeyVersion`, rejects non-active or expired state, performs
the timing-resistant comparison, and then performs a conditional mutation.

A correct code performs `active -> verified` exactly once. A wrong code
atomically increments `attemptCount`; attempts one through four remain active,
and attempt five performs `active -> terminal_failed`. Concurrent attempts
cannot exceed or bypass the limit. A correct code that loses the atomic race to
another success does not produce a second success.

After any security-state conditional mutation affects zero rows because it lost
a race, perform exactly one authoritative reread and map the result in this
priority order:

| Authoritative reread                                                                         | Response                   |
| -------------------------------------------------------------------------------------------- | -------------------------- |
| `now >= expiresAt` or `state == expired`                                                     | `409 verification_expired` |
| `state == terminal_failed`                                                                   | `409 verification_locked`  |
| missing row or `state` is `verified`, `superseded`, `delivery_pending`, or `delivery_failed` | `409 verification_invalid` |
| `state == active` and `now < expiresAt`                                                      | `429 retry_later`          |

The final active case means a concurrent mutation changed authority while the
challenge remains usable. Do not perform an unbounded internal verification
retry loop. Thus a second simultaneous correct request returns
`verification_invalid`; a correct request losing to the fifth wrong attempt
returns `verification_locked`; a correct request losing to expiry returns
`verification_expired`; a stale superseded challenge returns
`verification_invalid`; and another non-terminal active lost race returns
`retry_later`. Exactly one final authority transition succeeds.

## 18. Origin, Cookies, and CSRF

Production browser endpoints require the exact origin:

```text
https://generator.poparooz.com
```

Missing `Origin` fails closed. If `Sec-Fetch-Site` is present, it must be
compatible with same-origin production use and serves only as defense in depth,
not authentication. Wildcard CORS is prohibited.

There is no cookie or server-session authentication. Frontend requests use
`credentials: "omit"`, and the Worker sets no authentication or session cookie.
The design does not add a CSRF token for cookie authentication that does not
exist. Same-origin XSS remains a separate risk.

The production frontend and API are both on
`https://generator.poparooz.com`. Ordinary production same-origin responses do
not emit an `Access-Control-Allow-Origin` grant and never reflect request
`Origin`. There is no wildcard or credentialed CORS. Any future alternate
browser origin requires separate authorization, an explicit allowlist, and
separate CSP/CORS/security review; generic reflection is prohibited. Preview
environments use separately approved origins and configuration and do not
implicitly inherit production access.

## 19. Worker Response Headers

Every API response explicitly owns:

```text
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
X-Content-Type-Options: nosniff
Cross-Origin-Resource-Policy: same-origin
```

Pages `public/_headers` must not be assumed to apply. Document-oriented
`frame-ancestors` CSP,
`X-Frame-Options`, `Permissions-Policy`, and document CSP are not copied blindly
to JSON API responses.

## 20. Logging and Error Boundary

Raw or normalized email, submitted or derived OTP, challenge identity,
`providerSendEventId`, send-reservation linkage data, Turnstile token, provider
request payload, request body, and reversible identity must not enter any
console/application logs, controllable access/URL logs, traces, exception
metadata, monitoring breadcrumbs, analytics, downstream reports,
customer-facing errors, internal API error payloads, or arbitrary operational
metadata.

The same comprehensive prohibition applies to every server-only or API secret,
including `RESEND_API_KEY`, `TURNSTILE_SECRET`, `OTP_DERIVATION_KEY`, any future
separately authorized abuse-identity HMAC key, every superseded or rotating
version of those secrets, every secret binding value, and any derived credential
that could authenticate to an external or provider service. None may enter any
of the logging, telemetry, reporting, error, or operational-metadata surfaces
listed above.

`providerSendEventId` may exist only in the authorized bounded Email Gate
challenge/send state and rolling-cap reservation relation. It is never exposed
to the browser.

Internal errors use bounded safe categories only. The provider/account defaults
audit remains **UNPERFORMED** and is a production gate.

## 21. Retention and Reconciliation

The frozen A02-A01 maximum remains in force: verification-only normalized email
has at most seven days of active Poparooz-controlled retention and is deleted or
anonymized earlier when operational need is complete.

Daily aggregation uses UTC. A terminal challenge may update its issued-day and
terminal-day aggregates using only numeric counters. Candidate anonymous counts
are:

```text
challenges_issued
verification_successes
verification_invalid_attempts
verification_locked
verification_expired
delivery_failures
```

The exact counter units are:

- `challenges_issued`: increment once for every committed new issuance event,
  dated by the UTC date of `createdAt`; it does not mean provider acceptance,
  activation, or an HTTP provider attempt, and same-event retries do not
  increment it;
- `verification_successes`: increment once for each challenge whose final state
  is `verified`, dated by the UTC date of `terminalAt`;
- `verification_invalid_attempts`: increment by the final committed
  `attemptCount` for each terminal challenge; `attemptCount` contains committed
  wrong-code mutations only, not malformed, lost-race, correct-code, or
  pre-mutation rejected requests;
- `verification_locked`: increment once for a challenge ending in
  `terminal_failed`, dated by the UTC date of `terminalAt`;
- `verification_expired`: increment once for a challenge ending in `expired`,
  not for each HTTP response carrying `verification_expired`; and
- `delivery_failures`: increment once for a challenge ending in
  `delivery_failed`, not for individual Resend attempts.

A superseded challenge retains its `challenges_issued` count and any committed
wrong attempts. No success, locked, expired, or delivery-failure count is
invented unless its actual terminal state matches that definition. If issue and
terminal dates are equal, all increments to the same daily row resolve to one
deterministic final row value inside the reconciliation transaction.

Initial v1 has no marketing or deletion-count counter. For each terminal
challenge, one atomic D1 reconciliation transaction:

1. updates the issued-day aggregate using `createdAt`;
2. updates the terminal-day aggregate using `terminalAt`;
3. applies all required numeric counters;
4. sets the challenge `reconciledAt`; and
5. sets `reconciliationVersion`.

All aggregate updates and the challenge markers commit together or roll back
together. One `reconciledAt` is sufficient only because complete initial v1
reconciliation is one transaction. If issue and terminal dates are equal, the
same final counters are produced deterministically.

A challenge becomes deletion-eligible only after terminal state, complete
reconciliation, the end of operational retention need, and any authorized
bounded support/abuse window. Deletion/anonymization occurs afterward and does
not create another aggregate increment. Aggregation failure blocks deletion but
cannot reactivate verification.

## 22. Scheduled Cleanup

The frozen v1 schedule is hourly in UTC, processing at most 25
challenge rows per scheduled invocation. The scheduled handler:

- never sends verification email;
- performs bounded reconciliation and cleanup only;
- uses due-time indexes;
- is idempotent and retry-safe;
- tolerates partial backlog and continues later;
- never deletes unreconciled identity; and
- writes no raw identity to aggregates or logs.

If 25 rows are insufficient for measured production backlog, a later operational
review may adjust the batch without weakening retention or privacy. No ChatGPT,
Gmail, or Ops process controls cleanup.

## 23. D1 Time Travel and Restore

Logical deletion does not prove immediate disappearance from D1 Time Travel. A
restore restores both challenge state and D1 aggregate state to the chosen
historical point. After a restore and before normal service resumes, the system
re-evaluates expiry and deletion/anonymization, reconciles terminal rows that are
unreconciled in the restored database state, and does not apply rows already
reconciled in that restored state again.

Future downstream consumers read daily aggregate snapshots keyed by date plus
aggregate schema version plus reconciliation algorithm version, not append-only
challenge-level deltas. For each key, consumers UPSERT or REPLACE the complete
authoritative snapshot. They never append deltas, add a new snapshot to a prior
snapshot, or assume counts are monotonic. After restore and reconciliation, a
snapshot may move a previously observed count upward or downward, and the prior
value for that key is replaced. ChatGPT, Gmail, Analytics, and Ops remain
non-authoritative downstream consumers and never cause challenge reconciliation
mutations. This contract implements no downstream reporting.

Provider and D1 recovery behavior remains subject to the actual account and
platform acceptance stage.

## 24. Marketing Boundary

Initial Email Gate v1 contains no marketing checkbox, request field, database
table, provider synchronization, or marketing email. Missing consent must not be
stored as declined. Future marketing consent requires separate authorization,
and verification/download eligibility remains independent of marketing.

## 25. Secret Boundary

Future server-only secret categories are:

```text
RESEND_API_KEY
TURNSTILE_SECRET
OTP_DERIVATION_KEY
```

Any later-authorized network/email abuse HMAC key is a separate secret and must
not reuse `OTP_DERIVATION_KEY`. Secrets never use `VITE_*`; production and
preview secrets remain separate. No real secret is created by this stage.

## 26. Provider Adapter Boundary

The initial Worker should prefer narrow direct HTTP adapters over a Resend SDK
dependency. Resend and Turnstile payloads/results stay behind provider-neutral
adapters. Frontend contracts do not import provider types, and provider SDK usage
is not frozen into browser or shared API schemas.

## 27. Shared Contract Boundary

A future pure shared Email Gate contract module contains only strict Zod request
and response schemas, version constants, and provider-neutral result enums and
types. It imports no React, D1, Cloudflare binding, Resend, Turnstile, Pattern,
PNG, or generation runtime. Frontend and Worker may consume it; boundary tests
must enforce this dependency direction.

## 28. Worker Testing Direction

The repository currently uses Vitest `4.1.10`; Worker testing does not require a
Vitest major-version upgrade. A later authorized implementation may add
`@cloudflare/vitest-plugin` and Wrangler as development tooling, with separate
`vitest.worker.config.ts` and `tsconfig.worker.json` files. It must not replace
the existing jsdom frontend test project.

Pure state and schema tests may use normal Vitest. Worker/D1 integration and
concurrency tests run in the Workers runtime with isolated D1 test storage, real
migrations, and deterministic provider mocks. No dependency or configuration is
created in this documentation stage.

## 29. Required Test Gates

Before production, tests must cover:

- API: malformed JSON, body over 4,096 bytes, wrong content type, unknown field,
  wrong version, redirect, HTML fallback, and invalid status/body pairs;
- OTP: deterministic unbiased derivation, key version, wrong key, rotation
  overlap, compromised-key invalidation, and equal-length timing-resistant
  comparison;
- challenge: issue, replacement, expiry, wrong code, fifth-failure lock, replay,
  stale ID, and double verify;
- concurrency: simultaneous verify, issue, and replacement; zero-row conditional
  update; and batch rollback;
- provider: success, definite reject, timeout, ambiguous timeout, same-key retry,
  changed-payload and concurrent-idempotency conflicts, and D1 failure after
  provider acceptance;
- Turnstile: missing, invalid, expired, replayed, timed out, hostname mismatch,
  action mismatch, and provider failure;
- privacy: no raw OTP in D1, no email/code/token in logs, forbidden generator
  fields rejected, and no identity in aggregates;
- retention: aggregate once, aggregate failure, cleanup retry, no premature
  deletion, and restored-row reprocessing;
- browser: valid-marker backend bypass, malformed-marker lock, storage-write
  failure, backend unavailable, Pages HTML never unlocks, and Pattern
  replacement cancels the pending download; and
- accessibility: modal focus entry/trap/restore, keyboard, Escape/Close, status
  announcements, desktop/mobile, and standalone/Shopify iframe behavior.

The following deterministic and race cases are also mandatory:

- HMAC: normative vectors A, B, and C; counter encoding; big-endian parsing;
  threshold boundary; counter exhaustion fail closed; and reconstruction after
  Worker restart and deployment;
- version lifecycle: key rotation while active and pending; old renderer retained
  during pending retry; missing version fails closed; and template-version change
  cannot mutate an old payload;
- issuance: many simultaneous requests for one email; at most one eligible
  pending event; unique-constraint loser behavior; recovery versus new-event
  selection; expired-pending transition; and exhausted-pending transition;
- provider: attempt-reservation race; lease blocks a concurrent call; lease-expiry
  retry; attempt count never exceeds three; concurrent same-key conflict;
  changed-payload conflict; and identical payload reconstruction;
- global capacity: rolling-24-hour boundary; concurrent 89-to-90 reservation;
  concurrent exhaustion; same-event retry creates no reservation; and ambiguous
  provider outcome retains the original reservation;
- per-email limits: 60-second cooldown race, 3-per-30-minute race,
  6-per-24-hour race, and the local-part-case limitation;
- verification: two simultaneous correct codes, two simultaneous fifth wrong
  codes, correct code racing the fifth wrong attempt, correct code racing expiry,
  exact loser response/state, and stale superseded verification racing
  replacement activation;
- aggregation: same and different issue/terminal dates, any aggregate-write
  failure rolls back all writes, marker failure rolls back aggregates, cleanup
  after reconciliation, Time Travel re-reconciliation, and no deletion-count
  lifecycle; and
- browser: out-of-order issuance responses and proof that an older local request
  cannot replace the newer challenge context.

Final R02 determinism and privacy tests are mandatory:

- request schemas: empty Turnstile token; 2,048-character token accepted
  structurally; 2,049 rejected; uppercase, malformed, and non-v4 challenge UUID
  rejected; seven- and nine-character codes rejected; and non-digit code
  rejected;
- cooldown response: exact `resendAfterSeconds` ceiling behavior, zero at or
  after the 60-second minimum, never negative, and no implication that rolling
  limits are bypassed;
- issuance counting: committed events that later fail delivery or expire still
  count; rolled-back creation and same-event recovery do not; and exact 60-second,
  30-minute, and 24-hour lower boundaries;
- reservation privacy: `providerSendEventId` absent from logs, errors, analytics,
  and exports; expired reservations stop counting and are deleted by cleanup;
  cleanup failure leaves them non-counting but pending deletion;
- verification races: every authoritative reread and loser-response mapping in
  Section 17;
- aggregates: exact counter units, wrong attempts use committed `attemptCount`,
  expired HTTP responses do not multiply `verification_expired`, provider retries
  do not multiply `delivery_failures`, and same-day/cross-day totals are
  deterministic;
- restore/downstream: snapshot UPSERT replaces old values, upward and downward
  count changes are supported, and additive merge is prohibited; and
- CORS: normal same-origin response has no `Access-Control-Allow-Origin`,
  arbitrary Origin is not reflected, and wildcard CORS is absent.

Only one final verification state transition may win.

## 30. Repository Consequences

A later implementation is expected to add bounded files such as:

```text
worker/email-gate/
worker/email-gate/contracts/
worker/email-gate/providers/
worker/email-gate/repository/
worker/email-gate/migrations/
worker/email-gate/tests/
vitest.worker.config.ts
tsconfig.worker.json
wrangler.jsonc
```

It may also generate Worker environment types. Before any local secret exists,
`.gitignore` must protect `.dev.vars*`.

The existing static-hosting boundary test must be deliberately revised to allow
only the frozen standalone Worker architecture while continuing to prohibit
Pages Functions, Worker Custom Domain substitution, frontend/server coupling,
and server-side Pattern/image/PNG processing. No listed repository consequence
is implemented in this stage.

## 31. Provider and Infrastructure Gates

The following states remain explicit:

```text
PROVIDER-DEFAULT AUDIT: UNPERFORMED
RESOURCE CREATION: NOT STARTED
WORKER: NOT CREATED
D1: NOT CREATED
MIGRATIONS: NOT CREATED
TURNSTILE: NOT CREATED
RESEND: NOT CONFIGURED
DNS: NOT CHANGED
API: NOT IMPLEMENTED
EMAIL GATE UI: NOT IMPLEMENTED
```

Before resource creation and again before production activation, current
provider quotas, pricing, platform behavior, idempotency, route inventory,
logging, exception capture, request capture, retention, Time Travel, restore,
support access, subprocessors, region/jurisdiction, redaction, deletion, secret
rotation, and rollback must be rechecked and accepted. Production implementation
remains blocked.

## 32. Explicit Exclusions

This contract does not authorize or implement:

- Cloudflare Worker, Route, Custom Domain, D1, migration, Turnstile, Cron,
  Wrangler configuration, secret, DNS, Resend account/domain/key, or API;
- Email Gate React UI, analytics, scheduled reporting, ChatGPT/Gmail reporting,
  or Ops Dashboard;
- account, login, session, general customer database, Shopify customer or Admin
  integration, cart, order, inventory, or Commerce behavior;
- server-side image, Pattern, material, Palette, PNG, or generation processing;
  or
- changes to Pattern Matrix, processing, Quantizer, Matcher, Generation Palette,
  Generation Color Sets, `PublicPatternResult`, material authority,
  `DerivedMaterialRequirementV1`, PNG rendering, Board Layout, or the browser
  generation Worker.

## 33. Git Baseline

```text
branch: main
A02-A02-A01 entry HEAD: 4898d1eec987283fdf4faedb73f6058cde3a7644
A02-A02-A01 entry origin/main: 4898d1eec987283fdf4faedb73f6058cde3a7644
ahead / behind: 0 / 0
worktree at entry: clean
```

## 34. Frozen Decision

```text
A02-A02 SCHEMA / SECURITY / API CONTRACT FROZEN
```

The contract is **FROZEN**, **NOT IMPLEMENTED**, and **NOT DEPLOYED**. Production
implementation has not started. Production code and behavior remain unchanged.
No Worker, D1 database, migration, Turnstile widget, Resend resource, API,
secret, DNS record, marketing-consent collection, analytics, scheduled
aggregation, report, or Ops Dashboard has been created.
