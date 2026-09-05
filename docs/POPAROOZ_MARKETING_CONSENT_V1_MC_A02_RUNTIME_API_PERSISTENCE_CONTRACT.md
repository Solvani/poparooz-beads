# Poparooz Marketing Consent v1

## MC-A02 Runtime, API, and Persistence Contract

Status:

MC-A02-A02 COMPLETED /
CONTRACT APPROVED /
FROZEN /
COMMITTED /
PUSHED

Freeze commit: 416bd457c5578b9435b9e9010dfdaed0b0261ee0

MC-A02-A02-H01 CORRECTION APPROVED /
EFFECTIVE UPON SUCCESSFUL EXACT 3-FILE GOVERNANCE COMMIT

Before successful H01 commit: APPROVED / NOT EFFECTIVE / UNCOMMITTED / NOT PUSHED
After successful H01 commit: COMPLETED / CORRECTION APPROVED / COMMITTED / NOT PUSHED

Stage: MC-A02-A02
Project: Poparooz Generator
Pre-freeze authority baseline: 3309d558926a4fff368e1b84803e57badf812c1b

## 1. Authority and scope

The content of this MC-A02 runtime, API, and persistence contract became
authoritative and frozen when this document, together with the synchronized
Source of Truth and Project State updates, was successfully committed as the
MC-A02-A02 freeze governance set in commit
416bd457c5578b9435b9e9010dfdaed0b0261ee0. MC-A02-A02 is COMPLETED / CONTRACT
APPROVED / FROZEN / COMMITTED / PUSHED. No implementation or runtime acceptance
is implied.

MC-A02-A02-H01 is an approved narrow correction to stale withdrawal authority,
v1 source-context alignment, and logical-versus-physical metadata clarity. The
correction becomes effective only upon successful commit of the exact three-file
governance set. Before that commit it is APPROVED / NOT EFFECTIVE / UNCOMMITTED /
NOT PUSHED. After that commit it resolves to COMPLETED / CORRECTION APPROVED /
COMMITTED / NOT PUSHED.

MC-A00 remains the approved and frozen Marketing Consent v1 product, data, and
privacy authority. MC-A01 remains completed, authority-synchronized, and
closed.

This freeze gate authorizes no implementation, migration, deployment,
production collection, provider integration, marketing communication, Shopify
mutation, Cloudflare mutation, D1 mutation, or Feishu write.
## 2. Architectural boundary

Marketing Consent v1 uses a SEPARATE MARKETING CONSENT API.

Existing Email Gate v1 remains byte- and semantically unchanged. No Marketing
field is added to either strict request:

~~~text
POST /api/email-gate/v1/challenges
POST /api/email-gate/v1/verifications
~~~

No Marketing field is added to any Email Gate response. No Marketing column is
added to email_gate_challenges.

Marketing routes may share the existing Worker deployment and EMAIL_GATE_DB D1
binding, but must use separate routes, strict schemas, handlers, services, and
repository boundaries. Marketing persistence is never executed inline in the
Email Gate verification service.

## 3. Marketing API security envelope

Both Marketing endpoints require:

- POST only;
- application/json only;
- a strict JSON object;
- unknown fields rejected;
- request body at most 4,096 bytes;
- JSON response at most 4,096 bytes;
- application/json response;
- Cache-Control: no-store;
- no redirects;
- no email, credentials, internal identifiers, provider details, or D1 details
  in responses.

The only allowed production browser Origin is:

~~~text
https://generator.poparooz.com
~~~

Shopify embedding does not authorize https://poparooz.com as a direct browser
origin. Missing or unauthorized browser Origin fails closed without disclosing
Marketing state. Browser calls omit ambient credentials and treat redirects as
invalid. Unsupported methods and routes are rejected before Marketing handler
execution.

## 4. Grant API

Route:

~~~text
POST /api/marketing-consent/v1/grants
~~~

Exact strict request:

~~~json
{
  "schemaVersion": 1,
  "challengeId": "uuid-v4",
  "consentVersion": "marketing-consent-v1.0.0",
  "affirmativeIntent": true
}
~~~

affirmativeIntent must be literal true. False, omission, email, sourceContext,
Pattern, image, PNG, materials, colors, Shopify data, provider data, and unknown
fields are invalid.

Server-owned values:

~~~text
canonical_email = verified Email Gate challenge normalized_email
source_context = generator_email_download_gate
consent_version_sequence = 1
~~~

Strict results and envelopes:

~~~text
200 {"schemaVersion":1,"result":"grant_persisted"}
200 {"schemaVersion":1,"result":"already_active"}
400 {"schemaVersion":1,"result":"invalid_request"}
400 {"schemaVersion":1,"result":"version_unsupported"}
409 {"schemaVersion":1,"result":"verification_authority_invalid"}
503 {"schemaVersion":1,"result":"service_unavailable"}
~~~

Malformed JSON, invalid request fields, invalid media type, an oversized body,
and unknown fields produce invalid_request. A recognized request with an
unsupported schemaVersion produces version_unsupported. Invalid challenge
authority always produces the same verification_authority_invalid result.

A replay of a successfully persisted grant operation returns grant_persisted.
A different recent verified challenge for an already-active same-version
subscription returns already_active.

An already_active response does not create a Marketing transition event and
does not authorize later reactivation. Every later replay is re-evaluated
against the subscription's current state. If the current subscription is
withdrawn, the post-withdrawal freshness rules in sections 6 and 11 take
precedence over the otherwise-valid 10-minute challenge authority. A
pre-withdrawal challenge must not reactivate a withdrawn subscription.

## 5. Withdrawal API

Route:

~~~text
POST /api/marketing-consent/v1/withdrawals
~~~

Exact strict request:

~~~json
{
  "schemaVersion": 1,
  "challengeId": "uuid-v4"
}
~~~

The request never accepts email.

Strict results and envelopes:

~~~text
200 {"schemaVersion":1,"result":"withdrawn"}
200 {"schemaVersion":1,"result":"already_withdrawn"}
200 {"schemaVersion":1,"result":"not_active"}
400 {"schemaVersion":1,"result":"invalid_request"}
400 {"schemaVersion":1,"result":"version_unsupported"}
409 {"schemaVersion":1,"result":"verification_authority_invalid"}
503 {"schemaVersion":1,"result":"service_unavailable"}
~~~

The server resolves canonical email only from verified challenge authority. A
same logical withdrawal replay returns withdrawn without a second event or
timestamp rewrite. A different operation against an already-withdrawn
subscription returns already_withdrawn. No retained subscription returns
not_active.

Grant and withdrawal source context is the server-owned
generator_email_download_gate frozen by MC-A00. Withdrawal remains
distinguishable through event_type = withdrawn. No source context is
client-authoritative.

## 6. Verified challenge authority

Grant and withdrawal require:

~~~text
challenge.state == verified
challenge.verified_at != null
server_now >= challenge.verified_at
server_now - challenge.verified_at <= 600000
~~~

The upper boundary is inclusive and the server clock is authoritative. Missing,
future-dated, expired, deleted, or nonverified challenge authority produces
verification_authority_invalid.

Reading challenge authority does not refresh it, extend Email Gate retention,
mutate Email Gate state, or copy Marketing intent into Email Gate storage. The
challenge proves control of its verified email; the route and strict request
define the Marketing action.

### Post-withdrawal grant freshness

When the resolved Marketing subscription currently has status withdrawn, a
grant request has these additional authority requirements:

~~~text
challenge.created_at > subscription.withdrawn_timestamp
challenge.verified_at > subscription.withdrawn_timestamp
~~~

Both comparisons are strict. Equality fails. A challenge created before
withdrawal but verified after withdrawal also fails. The normal inclusive
10-minute authority window remains necessary but is not sufficient for
withdrawn-to-regrant authority.

This rule requires a genuinely new post-withdrawal verification flow rather
than late completion or replay of a pre-withdrawal challenge. Both created_at
and verified_at must be strictly later than the current withdrawn_timestamp.

If either freshness predicate fails, the endpoint returns:

~~~text
409 {"schemaVersion":1,"result":"verification_authority_invalid"}
~~~

It performs no subscription mutation, state_version increment, event
insertion, timestamp rewrite, or retention change. The response does not reveal
whether created_at, verified_at, withdrawn_timestamp, or the ordinary authority
window caused the failure.

### Active-withdrawal freshness

When the resolved Marketing subscription currently has status active, a
withdrawal request has these additional authority requirements:

```text
challenge.created_at > subscription.consent_timestamp
challenge.verified_at > subscription.consent_timestamp
```

Both comparisons are strict. Equality fails. The consent_timestamp is the
server-authoritative timestamp of the current effective grant or regrant. A
challenge created before or at that grant, including one verified after the
grant, cannot withdraw the newly active subscription. The normal inclusive
600000-millisecond authority window remains necessary but is not sufficient.

If either active-withdrawal freshness predicate fails, the endpoint returns:

```text
409 {"schemaVersion":1,"result":"verification_authority_invalid"}
```

The subscription remains active. No state_version, consent_timestamp,
withdrawn_timestamp, or retention_delete_after value changes; no withdrawal
event is inserted; and no timestamp or retention value is rewritten. The
response does not reveal which freshness predicate failed.

## 7. Browser consent lifecycle

Pre-effective intent states are:

~~~text
NOT_PRESENT
DECLINED
AFFIRMATIVE_INTENT
~~~

AFFIRMATIVE_INTENT is not a grant.

- Legacy or absent control means NOT_PRESENT.
- Rendered unchecked means DECLINED.
- Checked means AFFIRMATIVE_INTENT.
- The checkbox is optional, unchecked by default, and shown only during email
  entry.
- It is absent from the OTP step.
- Any actual email value change immediately resets intent to DECLINED.
- Explicit Change Email resets intent to DECLINED.
- Changing email never transfers affirmative intent.
- Issue and resend retain an immutable submitted snapshot tied to the submitted
  email and resulting challenge.
- Only the affirmative snapshot associated with successful verification may
  trigger a grant call.
- Withdrawn-to-regrant requires a fresh AFFIRMATIVE_INTENT snapshot associated
  with the same post-withdrawal challenge that satisfies section 6.
- A snapshot associated with any pre-withdrawal challenge must not be reused
  for regrant.
- NOT_PRESENT and DECLINED cause no Marketing API call or durable Marketing row.

MC-A00 remains the authority for exact checkbox copy.

## 8. Email Gate, unlock, Download, and Marketing ordering

The sequence is:

1. OTP verification succeeds.
2. Existing Email Gate commits verified state.
3. Existing Email Gate v1 returns verification_succeeded.
4. Browser commits local unlock.
5. The browser controller may independently start the pending Download
   continuation and the Marketing grant request when intent is affirmative.

Download and Marketing are sibling actions after local unlock. Neither awaits
or gates the other, and no strict ordering is required between starting them.

The controller owning Marketing timeout and result state must survive dialog
closure. Email Gate verification must not perform inline Marketing persistence
or create an unregistered fire-and-forget Worker Promise.

Marketing consent becomes effective only after Marketing D1 persistence
succeeds.

## 9. Failure and retry

Marketing failure or hang does not reverse verification, revoke unlock, cancel
Download, or retry Download.

~~~text
per-attempt timeout = 5 seconds
automatic retries = at most 1
retry jitter = 500 to 1500 milliseconds
~~~

Automatic retry is limited to network failure, client timeout, or HTTP 503 and
uses the exact same logical request. HTTP 400 and 409 are not automatically
retried.

A non-blocking manual retry may exist while the same 10-minute authority remains
valid. After expiry, recovery requires fresh verification and fresh affirmative
intent. Exact message styling is not frozen.

## 10. Logical idempotency

Grant operation key:

~~~text
SHA-256(
  UTF-8(
    "poparooz-marketing-consent-v1\0grant\0"
    + challengeId
    + "\0"
    + consentVersion
  )
)
~~~

Withdrawal operation key:

~~~text
SHA-256(
  UTF-8(
    "poparooz-marketing-consent-v1\0withdraw\0"
    + challengeId
  )
)
~~~

The operation key is stored as lowercase 64-character hexadecimal. It is not a
secret or authentication token. It is unique in marketing_consent_events.

event_id remains an independent random UUID and is not logical idempotency
authority. Replaying the same logical operation is idempotent success, not a
constraint error.

Withdrawal idempotency is evaluated against current subscription state. If
withdrawal operation A is replayed while the subscription remains withdrawn,
the replay returns withdrawn without a second event, state_version increment,
timestamp rewrite, or retention rewrite. If a later fresh valid grant or
regrant B returns the subscription to active, replaying old withdrawal A must
first satisfy active-withdrawal freshness against B's current
consent_timestamp. Historical idempotency does not override current active
state:

```text
withdraw A
-> regrant B
-> replay old withdrawal A
-> verification_authority_invalid
```

## 11. State transitions

First grant creates one active subscription, one granted transition event, the
consent timestamp, and state_version 1.

A same-operation grant retry creates no mutation or event, rewrites no
timestamp, and returns grant_persisted.

An active same-version subscription presented through a different recent
verified challenge receives no mutation or event, keeps its timestamp, and
returns already_active.

A future newer consent version may create one new grant transition only after
separate version authority is frozen. Current API v1 accepts only
marketing-consent-v1.0.0. Older authority never downgrades newer authority.

Withdrawn to regrant requires all of:

1. the current subscription status is withdrawn;
2. a newly created Email Gate challenge with challenge.created_at strictly
   greater than the current withdrawn_timestamp;
3. that same challenge successfully verifies with challenge.verified_at
   strictly greater than the current withdrawn_timestamp;
4. the challenge still satisfies the general inclusive 10-minute authority
   window;
5. a fresh AFFIRMATIVE_INTENT snapshot associated with that same challenge;
6. the current accepted consentVersion.

Only then may the server reuse the subscription identity, set status active,
clear withdrawn_timestamp and retention_delete_after, increment state_version,
write one granted transition event, and update consent version and timestamp.

Any grant based on a challenge created or verified at or before the current
withdrawn_timestamp is not regrant authority. It returns
verification_authority_invalid with no state mutation.

A fresh authorized withdrawal changes active to withdrawn immediately,
increments state_version, creates one withdrawal transition event, and sets
withdrawal and retention timestamps. A withdrawal challenge created or verified
at or before the current consent_timestamp is stale and returns
verification_authority_invalid without mutation. Already-withdrawn state is not
rewritten, and a same-operation replay while still withdrawn returns withdrawn
without another mutation.

## 12. Concurrency contract

canonical_email is unique. Each effective transition has a monotonically
increasing state_version. The subscription stores
last_transition_operation_key. Each event stores matching operation_key and
subscription_state_version.

One transactional D1 batch must perform:

1. conditional subscription insert or update;
2. conditional event insertion only when last_transition_operation_key equals
   the request operation key;
3. classification read for the operation and resulting state.

Mutation predicates reject processed operations, require a real state
transition, prevent version downgrade, and prevent older timestamps overwriting
newer state.

Two concurrent first grants converge to one subscription, one effective state
transition and event, no orphan event, no timestamp regression, and successful
grant_persisted and/or already_active classifications.

Transactionality alone does not prove semantic idempotency. D1 contract tests
must prove these invariants.

## 13. D1 physical contract

Exactly two Marketing tables are introduced:

~~~text
marketing_subscriptions
marketing_consent_events
~~~

email_gate_challenges is not altered.

MC-A00 freezes the logical Marketing Consent data model. The logical
marketing_consent_events field contract remains exactly:

```text
event_id
subscription_id
event_type
consent_version
source_context
event_timestamp
```

The following are the MC-A02 physical-only fields added beyond the MC-A00
logical contract in the frozen DDL.

```text
consent_version_sequence
retention_delete_after
state_version
last_transition_operation_key
subscription_state_version
operation_key
```

No additional physical field is authorized by this clarification. Any further
schema field requires a separate contract change.

They do not create additional product-level consent states or expand MC-A00's
logical Marketing Consent event contract. They are not customer-visible,
client-authoritative, API response, analytics, or CRM fields. They contain no
additional email identity; no Pattern, image, PNG, material, or color data; no
Shopify data; and no marketing-provider data. They exist only as internal
physical implementation metadata supporting the MC-A02 state-transition
contract and are retained in the physical schema for those mechanics.

FROZEN D1 TARGET UPON FREEZE-COMMIT EFFECTIVENESS:

~~~sql
CREATE TABLE marketing_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  canonical_email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'withdrawn')),
  consent_version TEXT NOT NULL,
  consent_version_sequence INTEGER NOT NULL
    CHECK (consent_version_sequence >= 1),
  consent_source_context TEXT NOT NULL,
  consent_timestamp INTEGER NOT NULL CHECK (consent_timestamp >= 0),
  withdrawn_timestamp INTEGER,
  retention_delete_after INTEGER,
  state_version INTEGER NOT NULL CHECK (state_version >= 1),
  last_transition_operation_key TEXT NOT NULL UNIQUE
    CHECK (
      length(last_transition_operation_key) = 64
      AND last_transition_operation_key NOT GLOB '*[^0-9a-f]*'
    ),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0),
  CHECK (updated_at >= created_at),
  CHECK (
    consent_timestamp >= created_at
    AND consent_timestamp <= updated_at
  ),
  CHECK (
    (
      status = 'active'
      AND withdrawn_timestamp IS NULL
      AND retention_delete_after IS NULL
    )
    OR
    (
      status = 'withdrawn'
      AND withdrawn_timestamp IS NOT NULL
      AND withdrawn_timestamp >= consent_timestamp
      AND withdrawn_timestamp <= updated_at
      AND retention_delete_after =
        withdrawn_timestamp + 63072000000
    )
  )
);

CREATE TABLE marketing_consent_events (
  event_id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  subscription_state_version INTEGER NOT NULL
    CHECK (subscription_state_version >= 1),
  operation_key TEXT NOT NULL UNIQUE
    CHECK (
      length(operation_key) = 64
      AND operation_key NOT GLOB '*[^0-9a-f]*'
    ),
  event_type TEXT NOT NULL CHECK (event_type IN ('granted', 'withdrawn')),
  consent_version TEXT NOT NULL,
  consent_version_sequence INTEGER NOT NULL
    CHECK (consent_version_sequence >= 1),
  source_context TEXT NOT NULL,
  event_timestamp INTEGER NOT NULL CHECK (event_timestamp >= 0),
  FOREIGN KEY (subscription_id)
    REFERENCES marketing_subscriptions(subscription_id)
    ON DELETE CASCADE,
  UNIQUE (subscription_id, subscription_state_version)
);

CREATE INDEX marketing_consent_events_subscription_time
  ON marketing_consent_events(subscription_id, event_timestamp);

CREATE INDEX marketing_subscriptions_retention_due
  ON marketing_subscriptions(retention_delete_after)
  WHERE status = 'withdrawn'
    AND retention_delete_after IS NOT NULL;
~~~

This DDL becomes the frozen MC-A02 implementation target when the governance
freeze commit becomes effective. The governance commit does not apply the D1
migration.

## 14. Retention and deletion

MC-A00 targets 24 months of minimal withdrawn suppression and audit retention.
The deterministic engineering interpretation is:

~~~text
730 days
63,072,000,000 milliseconds
~~~

This is not a new legal conclusion. If an applicable jurisdiction materially
requires another period, production collection requires an explicit contract
change.

Active subscriptions have retention_delete_after NULL. Withdrawn subscriptions
have retention_delete_after equal to withdrawn_timestamp plus 63072000000.
Eligibility becomes false at withdrawal commit, not deletion.

A later separately authorized cleanup may delete eligible subscriptions and
cascade their Marketing events. A separately authorized privacy workflow may
delete identifying Marketing data earlier. Marketing Consent does not extend
Email Gate retention.

## 15. Withdrawal and production gates

Minimum production-capable withdrawal:

1. user opens the Poparooz unsubscribe page;
2. user enters email;
3. unchanged Email Gate v1 verifies ownership with challenge and OTP;
4. browser receives verification_succeeded;
5. browser calls Marketing withdrawal using the verified challengeId;
6. withdrawal persists;
7. Marketing eligibility is immediately false.

No account or password is created.

Marketing Consent collection must not be production-enabled until the
verified-email withdrawal API, self-service browser flow, tests, and acceptance
pass.

No Marketing communication may be sent until a separately authorized provider
stage implements and verifies signed unsubscribe, suppression, and applicable
provider-side behavior. MC-A02 authorizes no Marketing provider.

## 16. Frontend contract

The future implementation may salvage only:

- checkbox and MC-A00 copy;
- optional and default-unchecked behavior;
- email-entry-only placement;
- OTP-step absence;
- focus-visible styling;
- tri-state intent;
- immutable submitted snapshot.

Required redesign:

- no Marketing field in Email Gate client or request;
- direct email changes reset intent;
- independent Marketing grant client;
- separate Marketing result state;
- Download never waits on Marketing.

Dirty dialog title, instruction, editorial, and privacy-footer changes require a
separate copy review and are not accepted here.

## 17. Required implementation tests

Future gates must prove:

- exact unchanged Email Gate v1 contracts and legacy behavior;
- unknown Marketing fields rejected by Email Gate v1;
- checkbox default, placement, absence, and reset behavior;
- no call or row for NOT_PRESENT or DECLINED;
- no grant after failed verification;
- separate grant after affirmative successful verification;
- Marketing latency, hang, timeout, and failure cannot affect unlock or
  Download;
- no client email or unrelated Pattern, image, PNG, material, color, Shopify,
  or provider data;
- authority-window boundaries and fail-closed invalid authority;
- same-operation and lost-response idempotency;
- already-active same-version behavior;
- no future version downgrade;
- withdrawn-to-regrant behavior;
- concurrent grant and timestamp/state-version invariants;
- withdrawal success, retry, already-withdrawn, and not-active behavior;
- active/withdrawn retention and cleanup cascade;
- no Email Gate retention change;
- no Shopify mutation or provider call.

Post-withdrawal regrant freshness tests must additionally prove:

1. **Old already-active replay:** while a subscription is active, challenge A
   is created and verified and its same-version grant returns already_active;
   after withdrawal, replaying grant A inside the ordinary 10-minute window
   returns 409 verification_authority_invalid. The subscription remains
   withdrawn; state_version, withdrawn_timestamp, retention_delete_after, and
   all other timestamps remain unchanged; and no grant event is inserted.
2. **Pre-withdrawal create, post-withdrawal verify:** a challenge created at or
   before withdrawal and verified after withdrawal cannot reactivate the
   subscription because created_at is not strictly later than
   withdrawn_timestamp.
3. **Equal timestamp boundary:** the grant is rejected if either
   challenge.created_at or challenge.verified_at equals withdrawn_timestamp.
4. **Valid post-withdrawal regrant:** a new challenge created and verified
   strictly after withdrawal, with a fresh affirmative snapshot bound to that
   challenge and still inside the 600000-millisecond window, reuses the same
   subscription identity, sets status active, clears withdrawal and retention
   timestamps, increments state_version exactly once, and creates exactly one
   granted transition event.
5. **No information leak:** every freshness failure above returns the same
   verification_authority_invalid result without revealing which challenge or
   withdrawal timestamp predicate failed.

Active-withdrawal freshness tests must additionally prove:

1. **Same-operation replay while still withdrawn:** the first withdrawal
   succeeds; replay returns withdrawn; and no second event, state_version
   increment, timestamp rewrite, or retention rewrite occurs.
2. **Old withdrawal replay after valid regrant:** withdraw A, perform fresh
   post-withdrawal regrant B, then replay old withdrawal A while A's challenge
   remains inside its ordinary 10-minute window. The result is
   verification_authority_invalid; the subscription remains active;
   state_version is unchanged; consent_timestamp remains B's current timestamp;
   and no withdrawal event or retention timestamp is created.
3. **Pre-current-grant create, post-current-grant verify:** a challenge created
   before or at the current consent_timestamp is rejected even if verification
   occurs after the current consent_timestamp.
4. **Equality boundaries:** withdrawal is rejected when either
   challenge.created_at or challenge.verified_at equals the current
   consent_timestamp.
5. **Valid fresh withdrawal:** a new challenge created and verified strictly
   after the current consent_timestamp and inside the ordinary
   600000-millisecond window withdraws exactly once, changes status to withdrawn,
   increments state_version exactly once, inserts exactly one withdrawn event,
   and writes withdrawn_timestamp and the correct retention_delete_after.
6. **No information leak:** every stale active-withdrawal failure returns the
   same verification_authority_invalid result without revealing which timestamp
   predicate failed.

## 18. Future stage sequence

~~~text
MC-A02-A02  Contract Freeze Gate
MC-A02-B01  Dirty Candidate Reconciliation
MC-A02-C01  D1 / Repository Implementation
MC-A02-C02  Grant API Implementation
MC-A02-C03  Withdrawal / Self-Service Implementation
MC-A02-D01  Frontend Integration
MC-A02-E01  Independent Code / Test Gate
MC-A02-E02  Browser QA Gate
MC-A02-F01  Deployment Readiness & Migration Plan
MC-A02-F02  Production Deployment
MC-A02-F03  Bounded Production Acceptance
~~~

MC-A02-R01 and MC-A02-R02 are not reused. Provider integration is a separate
later stage or project. No later stage begins here.

## 19. Freeze and correction status

~~~text
MC-A02-A02
Runtime / API / Persistence Contract Freeze Gate

FREEZE DECISION:
APPROVED

COMPLETED /
CONTRACT APPROVED /
FROZEN /
COMMITTED /
PUSHED

FREEZE COMMIT:
416bd457c5578b9435b9e9010dfdaed0b0261ee0

MC-A02-A02-H01:
CORRECTION APPROVED /
EFFECTIVE UPON SUCCESSFUL EXACT 3-FILE GOVERNANCE COMMIT

H01 COMMIT TRANSITION:
Before successful H01 commit:
APPROVED /
NOT EFFECTIVE /
UNCOMMITTED /
NOT PUSHED

After successful H01 commit:
COMPLETED /
CORRECTION APPROVED /
COMMITTED /
NOT PUSHED

ARCHITECTURE:
SEPARATE MARKETING CONSENT API

EMAIL GATE V1:
UNCHANGED

RUNTIME CANDIDATE:
PRESERVED /
UNCOMMITTED /
NOT ACCEPTED

NEXT ACTION:
Before successful H01 commit:
AUTHORIZED H01 AMEND

After successful H01 commit:
MC-A02-C01 — D1 / Repository Implementation

OPS DASHBOARD:
HOLD
~~~
