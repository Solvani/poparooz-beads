# Email Gate and Marketing Backend Rules

Parent global and repository rules remain in force. This file governs
`worker/email-gate/`.

- Email Gate v1 is an existing production contract. Marketing APIs MUST remain
  separate and MUST NOT casually extend strict Email Gate v1 requests, responses,
  or storage.
- Marketing grant and withdrawal are separate paths and operations.
- Marketing authority requires the matching Email Gate challenge in `verified`
  state with non-null `verified_at`. The server clock is authoritative; the
  freshness window is `600000` ms inclusive.
- Withdrawal of an active subscription and regrant after withdrawal MUST also
  satisfy the stricter freshness rules in the frozen Marketing contract.
- Browser withdrawal hands off only the verified `challengeId`. Email, local
  unlock, Download, and Pattern authority are not Marketing authority.
- Worker/provider behavior MUST fail closed without leaking customer state,
  internal errors, credentials, or storage details.
- D1 migration changes require explicit production authorization. MUST NOT
  manually edit the remote migration ledger or casually replay migration SQL.
- Worker deployment, D1 mutation, and Route mutation are separate mutation
  classes requiring separate authority and locks.
- The Marketing Route MUST remain `/api/marketing-consent/*`; MUST NOT replace it
  with broad `/api/*` routing.
- Secret values MUST NOT be printed.
- Relevant backend production changes require the authorized production Email
  Gate regression check.
- MUST NOT add a Marketing provider integration without separate authorization.
- Current deployment IDs, versions, counts, and status belong in
  `docs/PROJECT_STATE.md`.

Authority: `docs/POPAROOZ_MARKETING_CONSENT_V1_MC_A02_RUNTIME_API_PERSISTENCE_CONTRACT.md`.
