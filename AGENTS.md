# Poparooz Generator Repository Rules

Durable repository rules live here. Current facts belong in
`docs/PROJECT_STATE.md`; reusable procedures belong in `docs/AGENT_RUNBOOK.md`.

## 1. Required context and instruction order

Before work, read: active global `AGENTS.md`; this file; the nearest nested
`AGENTS.md` governing scoped files; `docs/PROJECT_STATE.md`;
`docs/AGENT_RUNBOOK.md` when applicable; then task instructions, contracts,
source, and tests.

Task instructions have highest authority for their exact scope. Nearest scoped
rules may specialize parents but MUST NOT silently weaken brand, privacy, Git,
contract, or production safety. Verify branch, HEAD, live remote when required,
ahead/behind, worktree, locks, authorized paths, and frozen boundaries. Stop on
unexpected dirt, a moving worktree, wrong baseline, conflict, or unauthorized
frozen area.

## 2. Product and brand

- This repository owns the Poparooz fuse-bead pattern generator for the US
  Shopify store.
- Poparooz is the only customer-facing brand.
- `MARD` may appear only in historical internal-reference or compatibility data.
- Never expose supplier identity, a third-party brand, or internal Palette fields.
- `M1` through `M15` are Poparooz-owned customer color codes.
- Customer copy defaults to English and MUST NOT invent brand, performance,
  safety, color-accuracy, or compliance claims.

## 3. Browser-local image privacy

User images MUST remain in the browser. MUST NOT upload, remotely persist, log,
or send image contents to analytics. MUST NOT add server-side image processing or
a network dependency to core generation. Changes require explicit product and
architecture authority.

## 4. Scope, quality, and dependencies

Implement only the authorized task. Avoid unrelated refactors, renames, formatting
sweeps, dependency upgrades, migrations, and UI rewrites. Reuse existing types,
components, utilities, tokens, and tests. Use npm and the committed lockfile.
Production dependency additions/upgrades require approval. Do not bypass problems
with broad `any`, unsafe casts, suppression, fallback, or weakened tests.

Preserve the Poparooz Design System and frozen Phase 2 UI. UI work must address
affected desktop, mobile, keyboard, and accessibility states; claim only QA done.

## 5. Git and Pages production semantics

The production branch is `main`. A normal push to `main` triggers Git-connected
Cloudflare Pages production deployment. A `main` push is a remote and
production-affecting write and MUST be authorized accordingly. Never report
`push performed / no production deployment` for it. After pushing, distinguish
the deployment trigger from a verified successful deployment.

No add, commit, push, pull, merge, rebase, reset, clean, switch, checkout, tag,
or remote change is authorized unless explicitly permitted. Follow global race
gates and the relevant runbook.

## 6. Durable production resource identities

- Pages production branch: `main`
- Worker: `poparooz-email-gate-prod`
- D1 database: `poparooz-email-gate-prod`
- D1 binding: `EMAIL_GATE_DB`
- Email Gate route family: `/api/email-gate/*`
- Marketing route family: `/api/marketing-consent/*`

Current SHAs, deployments, versions, flags, migrations, and route status belong
in `docs/PROJECT_STATE.md`. Repository authority does not authorize Worker, D1,
Route, Shopify, provider, secret, or other production mutations; each requires
exact authority and its own lock.

## 7. Email Gate and Marketing invariants

- Email verification remains required for Download; Marketing Consent is optional.
- Marketing failure MUST NOT block or reverse OTP, verification, unlock, or Download.
- Grant and withdrawal are separate capabilities with independent production flags.
- Withdrawal MUST be production-capable before grant activation.
- Marketing persistence does not imply a Marketing provider.
- Email Gate v1 contracts MUST NOT be casually changed; use a separate governed
  API or explicit versioned evolution.

Backend rules: `worker/email-gate/AGENTS.md`. Frontend Marketing rules:
`src/marketing-consent/AGENTS.md`.

## 8. Feishu governance triggers

Codex MUST NOT write Feishu unless exact records/fields are explicitly authorized.
Tell the controlling Chat `FEISHU SYNC MAY BE REQUIRED` after formal publication,
production deployment/verification, approval/freeze/acceptance/closure,
HOLD/RELEASE, or Current Stage/Next Action change. Do not request sync for normal
implementation, an unaccepted candidate, tests in progress, local-only commit, or
read-only audit.

## 9. Ops Dashboard

MUST NOT release or mutate Ops Dashboard without explicit authorization. Current
HOLD/RELEASE state belongs in `docs/PROJECT_STATE.md`.

## 10. Verification and completion

Use repository scripts. Run targeted and broader checks proportionately or as a
gate requires. Documentation-only changes need no application suite. Before
completion run `git diff --check`, `git diff --stat`, and `git status --short`.

Final reports MUST include Task, Implementation, Changed files, Verification,
Checks not run, Risks, and Git state. Git state includes branch, HEAD, worktree,
diff stat, staged state, commit, and push. Codex completion is not project-control
acceptance or freeze.
