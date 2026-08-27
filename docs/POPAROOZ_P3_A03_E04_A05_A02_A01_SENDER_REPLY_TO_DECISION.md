# Poparooz P3-A03-E04-A05-A02-A01 Sender and Reply-To Decision

Stage: `P3-A03-E04-A05-A02-A01`

Status: **COMPLETED / SENDER ACCEPTED / REPLY-TO FROZEN / RENDERER V1 READY FOR IMPLEMENTATION / PRODUCTION INACTIVE**

## 1. Authority and Scope

This document freezes the production sender identity, reply handling, and
tracking/receiving policy for Delivery Payload Version 1 of the Email Download
Gate. It accepts the task-supplied verified external Resend domain evidence and
closes the sender decision left open by
[`POPAROOZ_P3_A03_E04_A05_A01_DELIVERY_COPY_V1_FREEZE.md`](POPAROOZ_P3_A03_E04_A05_A01_DELIVERY_COPY_V1_FREEZE.md).

All other frozen product, privacy, topology, schema, security, delivery-copy,
and inactive-production boundaries remain in force. This governance stage does
not implement or register Renderer V1, change code or frontend schemas, operate
infrastructure, or activate production behavior.

## 2. Accepted Sending-Domain Evidence

The following externally verified Resend domain state is accepted as the
sending-domain authority for this decision:

```text
Domain: notify.poparooz.com
Resend status: Verified
Region: North Virginia / us-east-1
Sending: Enabled
Receiving: Disabled
DKIM: Verified
SPF / Return-Path: Verified
```

The prior unexplained-DNS provenance blocker is resolved: the reviewed records
belong to the currently controlled Resend domain object. The production sending
domain is therefore frozen as:

```text
notify.poparooz.com
```

No DNS change is authorized or performed by this stage. This acceptance closes
the sending-domain provenance and sender-decision gate only. It does not by
itself close unrelated provider-default, privacy, retention, logging,
support-access, subprocessor, quota, secret, route, D1, Turnstile, deployment,
or production-activation gates.

## 3. Frozen Sender Identity

The exact immutable From identity for Delivery Payload Version 1 is:

```text
Poparooz <verification@notify.poparooz.com>
```

Its frozen components are:

```text
Display name: Poparooz
Local part: verification
Sending domain: notify.poparooz.com
```

`no-reply` and `noreply` are not authorized alternatives for V1.

## 4. Frozen Reply Handling

The From address is transactional and send-only. Resend Receiving remains
disabled. Customer replies are routed only through the exact immutable Reply-To
identity:

```text
poparooz2026@gmail.com
```

The customer-visible behavior is:

```text
Received email From: Poparooz <verification@notify.poparooz.com>
Reply destination: poparooz2026@gmail.com
```

No inbound-email backend, receiving webhook, inbound-message storage,
attachment handling, or forwarding backend is introduced.

## 5. Delivery Payload Version 1 Consequence

The current provider-neutral `DeliveryPayload` model contains `from`, `to`,
`subject`, `text`, and optional `html`; it does not contain `replyTo`.
Renderer V1 implementation must extend that model with:

```ts
readonly replyTo: string;
```

For Delivery Payload Version 1, `replyTo` has exactly this immutable value:

```text
poparooz2026@gmail.com
```

`replyTo` is part of Delivery Payload Version 1 identity. It must not be read
from a mutable environment variable. For one `providerSendEventId`, every
same-event delivery attempt must reconstruct the same logical values for:

```text
from
replyTo
to
subject
text
html
```

The V1 presence, value, and provider-request serialization of Reply-To are
immutable. Any future Reply-To change requires a new separately authorized
`deliveryPayloadVersion`; it must not mutate V1 or alter a retry under an
existing provider idempotency key.

## 6. Provider Adapter Consequence

A future separately authorized implementation stage may extend the
provider-neutral `DeliveryPayload` and the direct Resend adapter to serialize
the frozen `replyTo` value using the then-current official Resend API field.
That provider-specific field name remains isolated inside the adapter.

Frontend and shared Email Gate request/response schemas must not expose
Reply-To or provider-specific delivery fields.

## 7. Tracking Policy

The frozen production policy is:

```text
Open tracking: disabled
Click tracking: disabled
Tracking subdomain: none
```

Production setup and activation must explicitly verify these values. Disabling
tracking does not eliminate provider delivery data or provider-controlled
retention.

## 8. Receiving Policy

The frozen production policy is:

```text
Resend Receiving: DISABLED
Inbound email: not introduced
Webhooks for inbound messages: not introduced
Inbound storage: not introduced
Attachment handling: not introduced
Forwarding backend: not introduced
```

Customer replies route through Reply-To only.

## 9. Renderer V1 Status

The sender identity and Reply-To contract are ready and frozen. Delivery Copy
V1 is already frozen. Renderer V1 is therefore ready for a separately
authorized implementation stage, but it is not implemented or registered by
this decision.

The production renderer registry remains empty and fail closed until that
implementation passes its required review. Production delivery remains
inactive.

## 10. Unchanged Production Boundary

This stage makes documentation and governance changes only:

```text
Production sender accepted: yes
Production Reply-To accepted: yes
Resend Receiving enabled: no
Renderer implemented: no
Real email sent: no
Worker deployed: no
D1 created: no
Turnstile created: no
Secret written: no
DNS changed by this stage: no
Frontend changed: no
Production behavior changed: no
```

## 11. Git Baseline

```text
branch: main
A05-A02-A01 entry HEAD: cfbd415ab77f4555c4eb2fa2758167b73944ed6e
A05-A02-A01 entry origin/main: cfbd415ab77f4555c4eb2fa2758167b73944ed6e
ahead / behind: 0 / 0
worktree at entry: clean
```

## Decision

```text
P3-A03-E04-A05-A02-A01
COMPLETED / FROZEN / RENDERER V1 READY FOR IMPLEMENTATION /
PRODUCTION INACTIVE
```
