# P3-A03-E04-A07-A02 OTP Derivation Key Production Contract

Status: **Frozen / ready for controlled infrastructure provisioning / production inactive**

Date: **2026-08-31**

## 1. Decision

The production `OTP_DERIVATION_KEY` contract is frozen for initial key version
`1`. The real production key is not generated or provisioned by this stage.

Initial v1 provisioning requires **no production code change**. This conclusion
is limited to the first version-1 key. The current production runtime cannot
hold version 1 and version 2 concurrently, so planned or emergency rotation to
a new version requires a separately authorized runtime change before rotation.

This stage creates no Worker, deployment, D1 binding or migration, secret,
route, Cron, Turnstile change, email, or frontend activation.

## 2. Authority and Entry State

This contract is subordinate to the Generator Source of Truth and reads with:

- `POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md`;
- `POPAROOZ_P3_A03_E04_A02_PROVIDER_TOPOLOGY_RETENTION_DECISION.md`;
- `POPAROOZ_P3_A03_E04_A02_A02_SCHEMA_SECURITY_API_CONTRACT.md`;
- `POPAROOZ_P3_A03_E04_A04_A00_BACKEND_FOUNDATION_FREEZE.md`;
- the A05 delivery-copy, sender, and Renderer V1 freezes; and
- `POPAROOZ_P3_A03_E04_A06_FRONTEND_FREEZE.md`.

A07-A01 remote inventory is the stage-entry evidence: Pages is healthy, the
standalone `poparooz-email-gate-prod` Worker and its route/custom domain are
absent, the intended D1 database exists with no user schema, the production
Turnstile widget exists for the approved hostname, the Cron and target Worker
secrets are absent, and the frontend Email Gate remains disabled. Inventory is
not provisioning or production acceptance.

## 3. Current Runtime Semantics

The current production entry point performs exactly:

```text
keyBytes = TextEncoder().encode(env.OTP_DERIVATION_KEY)
registry = { version 1 -> keyBytes }
activeVersion = 1
```

`TextEncoder` produces UTF-8 bytes. No Base64, Base64url, or hexadecimal decode
occurs in the production path. `decodeHexKey()` is a test/helper function and is
not used by `worker/email-gate/index.ts`. The resulting bytes are imported as a
non-extractable, sign-only raw HMAC-SHA-256 key.

The runtime currently performs no secret alphabet, length, or entropy
validation. The controlled provisioning procedure therefore owns exact format
validation before the value reaches Wrangler. Runtime derivation remains fail
closed when a recorded key version is absent or HMAC derivation fails, but an
operator-supplied weak or malformed string would not be detected by the current
code. This operational dependency is accepted for initial v1 only.

## 4. Entropy and Generation

The production value must originate from exactly **32 independently random
bytes**, providing **256 bits of random entropy**, generated in a trusted
administrative environment by an operating-system-backed CSPRNG. An approved
implementation is Node.js `crypto.randomBytes(32)` or an equivalently reviewed
cryptographic random-byte API.

The key must never be:

- chosen, typed, or edited by a human;
- generated with `Math.random()`;
- derived from an account, email, domain, password, phrase, timestamp, UUID, or
  another secret; or
- reused from production, preview, staging, Resend, Turnstile, or any other
  system.

The generation tool and output handling must be reviewed before the separately
authorized ceremony. This document intentionally supplies no command that
prints a real key to a terminal.

## 5. Representation and HMAC Key Bytes

The frozen storage representation is **RFC 4648 Base64url without padding**:

```text
source: exactly 32 CSPRNG bytes
encoding: Base64url, URL-safe alphabet, no "=" padding
stored length: exactly 43 ASCII characters
allowed form: ^[A-Za-z0-9_-]{43}$
Worker secret name: OTP_DERIVATION_KEY
```

The 43-character encoding is injective for a 32-byte input and therefore
retains the source's 256 bits of entropy. The representation is selected because
it is printable, unambiguous, and contains no whitespace, quote, shell-control,
or padding characters.

Critically, the current Worker does **not** decode the Base64url text. For key
version 1, the HMAC key material is the exact 43 ASCII characters encoded as 43
UTF-8 bytes. The decoded 32 source bytes are generation input, not the bytes
passed to Web Crypto. Documentation, test vectors, operators, and recovery tools
must not substitute a decoded-byte semantic.

Trailing newline, carriage return, whitespace, padding, prefix, suffix, or
Unicode normalization is prohibited. Before provisioning, the ceremony must
validate the exact length and alphabet without logging the value.

## 6. Version 1 Identity and Persistence

`EMAIL_GATE_OTP_KEY_VERSION = 1` is frozen for initial production. Version 1
means the immutable tuple:

```text
algorithm: POPAROOZ_EMAIL_GATE_OTP_V1
secret representation: exact 43-character Base64url text
HMAC key bytes: UTF-8 encoding of that exact text
```

Each challenge persists `otp_key_version` in D1. New challenges copy the active
registry version. Delivery recovery reads the recorded version and must derive
the same OTP so that the same `challengeId`, provider event, payload version,
payload, and idempotency identity are reused. Verification also reads the
recorded version and re-derives the OTP after issue. The key is therefore needed
for both non-expired `delivery_pending` and `active` challenges.

The bytes assigned to a version are immutable. Replacing the value while still
calling it version 1 is prohibited: it would silently invalidate existing
version-1 challenges and same-event recovery.

## 7. Planned Rotation and Overlap

Routine rotation is event-driven, not calendar-driven. It is required for
suspected exposure, loss of custody assurance, access-control failure, or a
separately approved cryptographic-policy change. Optional periodic rotation may
be scheduled by a later operations policy, but must use the same overlap model.

Before version 2 can issue any challenge, a separately authorized code and
configuration stage must provide a production registry that contains both the
immutable version-1 key and a new, independently generated version-2 key while
selecting version 2 for new challenges. No secret binding names or implementation
shape for that future registry are frozen here.

The safe sequence is:

1. Generate and escrow an independent version-2 value under an approved ceremony.
2. Deploy a reviewed bridge runtime with versions 1 and 2 present but version 1
   still active. Confirm that 100% of serving production versions can resolve
   both keys.
3. Only then deploy the activation runtime with both keys still present and
   version 2 active for new challenges. A gradual rollout at this step may mix
   only versions that can both resolve versions 1 and 2; it must never mix the
   old version-1-only runtime with a version-2-active runtime.
4. Confirm all production traffic uses the intended active version and record
   the last possible version-1 challenge creation time.
5. Keep version 1 available while any non-expired eligible `delivery_pending` or
   `active` challenge can reference it.
6. Wait at least 600 seconds after the last possible version-1 challenge
   creation, then confirm by read-only D1 evidence that no eligible non-expired
   version-1 challenge remains. A timer alone is insufficient.
7. Remove version 1 only through a separately reviewed deployment after that
   proof.

The 15-second provider lease and up-to-three provider attempts do not extend a
challenge beyond its fixed 600-second expiry. The maximum lifecycle overlap is
therefore 600 seconds after the last possible old-version creation, but gradual
deployment, clock uncertainty, in-flight issuance, and evidence collection may
make the operational overlap longer. Longer is safe; early key removal is not.

Rollback during overlap must retain both keys and change only the active version
through reviewed code/configuration. Rollback must never reassign different
bytes to an existing version. After an old key is removed, restoring code alone
is insufficient; rollback also requires the exact escrowed key and a reviewed
registry restoration. Cloudflare version rollback must not be assumed to restore
secret material correctly without explicit verification.

## 8. Emergency Revocation

On suspected compromise, containment takes precedence over preserving active
challenges:

1. Keep or force the frontend Gate disabled and stop new issuance.
2. Disable/remove the Email Gate route or otherwise stop Worker traffic under a
   separately authorized incident action.
3. Preserve D1 and operational evidence; do not reset or destroy the database.
4. Identify and invalidate all non-expired `delivery_pending` and `active`
   challenges that reference the compromised version through an authorized,
   auditable D1 operation.
5. Generate an independent replacement, increment the key version, provision it,
   and deploy reviewed version-aware runtime support before service resumes.
6. Revoke/remove the compromised secret version after containment evidence is
   complete.

Customers with invalidated challenges must request a new code. Because the
current runtime supports only one version, the Gate must remain unavailable
until the replacement version and corresponding runtime change are safely
deployed. `RESEND_API_KEY` and `TURNSTILE_SECRET` remain unchanged unless there
is independent evidence that either was also compromised.

## 9. Escrow, Recovery, and Custody

An encrypted recovery/escrow copy is required because deterministic retry,
verification, rollback, and incident recovery may require the exact historical
value, while Cloudflare does not reveal a Worker secret value after it is set.

The escrow must be held in an approved external secret manager or encrypted
enterprise vault with MFA, least-privilege access, access audit, and protection
equivalent to or stronger than the Worker secret. At least two authorized
operators or an approved break-glass control must prevent a single lost account
from making recovery impossible.

The value must never exist in Git, repository files, documentation, tests,
issues, pull requests, ChatGPT/Codex transcripts, shell history, terminal
transcripts, screenshots, analytics, Pages/Vite configuration, frontend bundles,
Shopify, email, or plaintext local files. Clipboard use, if unavoidable during
an approved ceremony, must be limited to the trusted session and cleared after
successful escrow and provisioning.

## 10. Controlled Wrangler Provisioning Rule

Provisioning is a future production mutation and requires separate explicit
authorization. Because A07-A01 found the target Worker absent, an approved
undeployed Worker version must exist before a version-secret command can target
it.

For the initial secret, use Wrangler's interactive hidden prompt and the exact
name and target:

```text
wrangler versions secret put OTP_DERIVATION_KEY --name poparooz-email-gate-prod
```

This creates a Worker version but does not authorize deploying it. The resulting
version ID, code, bindings, D1 target, and secret-name metadata must be reviewed,
then deployment must occur as a separate authorized step. If the approved
Wrangler version or target topology cannot support this sequence, stop and
re-review the ceremony; do not fall back to a command-line value, `echo`, a
checked-in file, or an unprotected temporary file.

Ordinary `wrangler secret put` creates and immediately deploys a Worker version
under current Cloudflare semantics. It may be used only when the same production
change explicitly authorizes that immediate deployment and its exact target has
been preflighted; it is not the default ceremony.

Post-provision evidence is limited to the secret name/type from `wrangler secret
list`, the intended key version, success status, and date/time if required. The
secret value is never read back, printed, compared in a transcript, or exposed
as evidence.

## 11. Logging and Evidence Prohibition

Application, Worker, audit, CI, and operator logs must never contain the secret
value, derived key bytes, generated OTP, or recovery copy. No hash, digest,
fingerprint, prefix, suffix, length-derived sample, or screenshot of key material
may be published unless a later security review explicitly justifies a bounded
mechanism. Current evidence records only:

- secret name `OTP_DERIVATION_KEY`;
- logical key version;
- provisioning success or failure; and
- date/time when operationally necessary.

Format validation returns only pass/fail and must not echo rejected input.

## 12. Environment and Secret Separation

`OTP_DERIVATION_KEY` is a Worker-only secret. It must not enter Vite or any
`VITE_*` variable, Pages environment, browser JavaScript, the frontend bundle,
Shopify, Git, documentation, tests, analytics, or console logs. Production and
future preview/staging environments use independently generated material by
default; copying production material into another environment is prohibited.

`OTP_DERIVATION_KEY`, `TURNSTILE_SECRET`, and `RESEND_API_KEY` are independent
secret categories. No value is reused, and none is generated or derived from
another. Rotation or compromise of one does not imply rotation of the others
without separate evidence.

## 13. Implementation Delta

Classification for initial version-1 provisioning:

```text
NO CODE CHANGE REQUIRED
```

The existing UTF-8 string consumption exactly matches the frozen 43-character
text-as-HMAC-key representation, and the service persists and resolves version
1 correctly. Provisioning controls must enforce the format because runtime does
not.

Classification before introducing version 2 or any planned overlapping
rotation:

```text
SEPARATELY AUTHORIZED MINIMAL RUNTIME CHANGE REQUIRED
```

At minimum, `worker/email-gate/runtime-ports.ts` and
`worker/email-gate/index.ts` must expose and populate version-specific production
key material so `createOtpKeyRegistry()` can hold old and new versions
concurrently while selecting an explicit active version. Exact binding names,
validation behavior, deployment sequencing, and new tests require their own
review. This contract does not authorize that change.

## 14. External Standards and Platform Facts

- [RFC 4648, sections 3.2 and 5](https://www.rfc-editor.org/rfc/rfc4648.html)
  defines Base64url and permits omitted padding when data length is implicit.
- [Node.js `crypto.randomBytes`](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback)
  generates cryptographically strong pseudorandom bytes.
- [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
  documents encrypted text bindings, hidden values, and the difference between
  immediate `secret put` deployment and version-only secret creation.
- [Wrangler Worker commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
  documents `secret list`, `secret put`, `versions secret put`, version upload,
  deployment, and rollback behavior.

## 15. Frozen Result

```text
REAL OTP KEY GENERATED: NO
OTP SECRET WRITTEN: NO
WORKER DEPLOYED: NO
REMOTE D1 MUTATED: NO
MIGRATION APPLIED: NO
TURNSTILE CHANGED: NO
RESEND SECRET WRITTEN: NO
ROUTE CREATED: NO
CRON CREATED: NO
REAL EMAIL SENT: NO
FRONTEND GATE ENABLED: NO
```

The contract is frozen and ready for a separately authorized, controlled
infrastructure-provisioning stage. Production Email Gate behavior remains
inactive.
