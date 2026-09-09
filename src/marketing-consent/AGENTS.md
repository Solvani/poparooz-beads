# Marketing Consent Frontend Rules

The global and repository rules remain in force. This file governs the
`src/marketing-consent/` subtree.

- `VITE_MARKETING_CONSENT_ENABLED` controls grant UI only.
- `VITE_MARKETING_WITHDRAWAL_ENABLED` controls withdrawal UI/entry only.
- Flags MUST remain independent. Exact lowercase `true` is the only enabled value
  under the approved runtime implementation.
- An unavailable capability MUST fail closed. A disabled capability MUST NOT
  instantiate its network client or another network dependency.
- Marketing failure MUST NOT affect Download, Email Gate verification, or local
  unlock.
- Withdrawal requires fresh Email Gate verification. Local unlock, Pattern, and
  Download authority MUST NOT be reused.
- Withdrawal hands off `challengeId` only; the client MUST NOT send email to the
  withdrawal endpoint.
- HTTP 409 `verification_authority_invalid` invalidates authority and requires
  fresh verification.
- `withdrawn`, `already_withdrawn`, and `not_active` MUST use one privacy-safe
  terminal presentation that does not reveal prior subscription state.
- Copy MUST refer specifically to Marketing emails/preferences and MUST NOT imply
  that all Poparooz email is disabled.
- Direct `/unsubscribe` routing MUST remain independent from Download.
- Current flags, deployment state, and stage status belong in
  `docs/PROJECT_STATE.md`.
