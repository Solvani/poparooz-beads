# Poparooz P3-A03-E04-A05-A01 Delivery Copy V1 Freeze

Stage: `P3-A03-E04-A05-A01`

Status: **COMPLETED / COPY V1 FROZEN / RENDERER IMPLEMENTATION BLOCKED / PRODUCTION INACTIVE**

## 1. Authority and Scope

This document freezes the Production Delivery Copy V1 product authority for the
Email Download Gate. It freezes the exact subject, exact plain-text copy, HTML
semantic requirements, OTP representation, expiry wording, and transactional
content boundary.

This stage does not implement or register a production renderer. It does not
accept a production sender, modify the frontend, activate the Email Download
Gate, or create or mutate any provider or infrastructure resource.

## 2. Exact Subject

The exact V1 subject is:

```text
Your Poparooz verification code
```

The OTP must not appear in the subject.

## 3. Exact Plain-Text Copy

The exact V1 plain-text copy is:

```text
Your Poparooz verification code is:

{{OTP}}

Use this code in Poparooz to verify your email and continue your pattern download.

This code is valid for up to 10 minutes after it was requested.

If you didn't request this code, you can ignore this email.

Poparooz
```

`{{OTP}}` is the sole dynamic body substitution. It is replaced by exactly eight
ASCII digits. The recipient email belongs only in the provider `to` field and
must not be echoed in the body or HTML.

No challenge ID, provider event ID, Pattern data, image data, materials,
Shopify/order data, marketing, promotion, link, tracking, or account/password
claim may be added.

## 4. HTML V1 Semantic Contract

Delivery Copy V1 permits text plus minimal HTML. The HTML must preserve the
exact semantic meaning of the plain-text copy and must satisfy all of these
requirements:

- use a UTF-8 document;
- render Poparooz branding as text;
- contain exactly eight ASCII OTP digits in document text;
- present the OTP at a large, readable size;
- contain no links, remote images, logo image requests, external fonts,
  JavaScript, forms, tracking pixels, or external CSS/resources;
- contain no marketing footer or promotional call to action;
- imply no account or password;
- not echo the customer email;
- use `role="presentation"` on presentation tables; and
- retain a meaningful source order when CSS is disabled.

The exact implementation-level HTML serialization is not frozen in this stage.
It may be frozen only when Renderer V1 is separately implemented. These copy
and semantic requirements are immutable V1 product authority.

## 5. OTP Representation

The canonical presentation example is:

```text
12345678
```

The OTP is exactly eight ASCII digits with no spaces, hyphens, Unicode
separators, or localized digits. It must not appear in the subject, a URL, or
an external resource request. A later renderer may use CSS letter spacing, but
CSS must not alter the actual accessible or copied characters.

## 6. Expiry Wording

The exact authoritative wording is:

```text
This code is valid for up to 10 minutes after it was requested.
```

The challenge lifetime is 600 seconds from creation. Provider and delivery
latency reduce the customer's remaining usable time, so `This code expires in
10 minutes.` is not authoritative V1 copy.

## 7. Transactional Security and Privacy Boundary

The verification email is transactional only. It contains no marketing,
coupon, upsell, cross-sell, newsletter, social call to action, download link,
verification link, support link, external URL, tracking beacon, UTM parameter,
Pattern preview, Pattern attachment, image, material list, or Shopify purchase
data.

The exact unsolicited-message wording is:

```text
If you didn't request this code, you can ignore this email.
```

The email must not tell the customer to forward or share the code.

## 8. Sender and Renderer Status

The following are candidates only and are not production authority:

```text
Display name candidate: Poparooz
Recommended local part: verification@
Sending-domain candidate: notify.poparooz.com
Production sender: NOT ACCEPTED
Renderer V1: BLOCKED PENDING SENDER ACCEPTANCE
```

`Poparooz <verification@notify.poparooz.com>` is not frozen as the production
sender. The `from` value is part of immutable `DeliveryPayloadVersion` identity
and cannot be sourced later from mutable configuration. Because the sender is
unresolved, the production renderer registry remains empty and fail closed.

## 9. Unchanged and Inactive Boundaries

This freeze changes documentation and governance only:

```text
Production renderer implemented: no
Production renderer active: no
Production sender accepted: no
Frontend changed: no
Provider/resource production mutation: no
Production behavior changed: no
```

No Resend domain or API key, DNS record, Worker deployment, D1 resource,
Turnstile resource, Route, Cron Trigger, or secret is created or changed. No
real email is sent.

## Decision

```text
P3-A03-E04-A05-A01
COMPLETED / COPY V1 FROZEN / RENDERER IMPLEMENTATION BLOCKED /
PRODUCTION INACTIVE
```
