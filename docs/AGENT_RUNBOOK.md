# Poparooz Agent Execution Runbook

Use the playbook matching the authorized mutation class. Global and repository
rules remain controlling. A playbook is procedure, not authorization. Every
report names prerequisites, locks, allowed and forbidden mutations, verification,
stop conditions, final resource/Git state, and lock release.

## 1. Read-only audit

- Prerequisite: exact scope, baseline, and non-mutating evidence sources.
- Lock: none.
- Allowed: bounded reads and checks that cannot rewrite local or remote state.
- Forbidden: edits, generators/caches, staging, Git or external mutations.
- Verify: initial/final Git state and hashes when stability matters.
- Stop: moving worktree, unresolved baseline, or a possibly mutating tool.
- Report: evidence, limitations, final state, and zero write counts.

## 2. Local implementation

- Prerequisite: authorized paths, expected baseline, contracts, source, and tests.
- Lock: `repo:D:\Projects\poparooz-beads` WRITE.
- Allowed: authorized local files and proportionate local checks.
- Forbidden: unrelated paths, staging, commit, push, deployment, external writes.
- Verify: targeted/required checks, diff review, and final status.
- Stop: conflict, unexpected dirt, frozen-contract issue, failure, or concurrent change.
- Report: files, behavior, checks, risks, dirty candidate, and lock release.

## 3. Local commit

- Prerequisite: reviewed stable candidate, commit authority, expected parent, passed checks.
- Lock: repository WRITE.
- Allowed: stage exact authorized paths and create the authorized commit.
- Forbidden: amend, extra paths, cleanup, branch switch, push, production mutation.
- Verify: staged content, parent, subject, `git show --check`, post-commit state.
- Stop: candidate drift, extra staged path, wrong parent, or check failure.
- Report: SHA, subject, parent, paths, checks, Git state, and lock.

## 4. Normal push

- Prerequisite: push authority, exact commit, clean tree, expected live remote parent.
- Lock: repository; add each production resource when the push triggers production.
- Allowed: one normal fast-forward push of the named ref.
- Forbidden: force, amend, merge, rebase, extra commits, unrelated refs.
- Verify: live remote before/after, ancestry, ahead/behind, production trigger/state.
- Stop: remote movement, unverifiable required gate, wrong ref, or dirty state.
- Report: push output, refs, production effect, checks, and locks.

## 5. Cloudflare Pages release

- Prerequisite: exact source commit/project, production authority, current deployment,
  rollback anchor.
- Lock: repository plus exact Pages production resource.
- Allowed: authorized normal `main` push or named Pages action only.
- Forbidden: adjacent Worker, D1, Route, Shopify, provider, or flag changes.
- Verify: serving deployment/source, HTTPS, bounded smoke, affected customer behavior.
- Stop: source/target mismatch, failed deploy, or missing rollback identity.
- Report: trigger, deployment/source, serving proof, qualifications, Git, locks.

## 6. Worker deployment

- Prerequisite: reviewed candidate, deploy authority, active version, bindings/routes,
  rollback anchor.
- Lock: exact Worker; repository only if repository state also changes.
- Allowed: deploy the named Worker candidate.
- Forbidden: D1, Route, secret, Pages, and provider mutations outside scope.
- Verify: uploaded/deployed/serving states, version/rollout, bounded APIs, required
  Email Gate regression.
- Stop: drift, wrong version, unplanned partial rollout, or regression failure.
- Report: old/new identities, rollout, verification, rollback, adjacent state, locks.

## 7. D1 migration

- Prerequisite: reviewed migration, exact database/binding, live ledger, recovery plan,
  production authority.
- Lock: exact D1; add other locks only for resources also mutating.
- Allowed: apply only the named unapplied migration once.
- Forbidden: ledger edits, casual replay, unrelated SQL/data, Worker/Route changes.
- Verify: ledger delta, schema invariants, bounded non-PII counts, compatibility.
- Stop: ledger/schema mismatch, partial apply, unexpected data, invariant failure.
- Report: migration/database, ledger/data effects, verification, recovery, locks.

## 8. Worker Route mutation

- Prerequisite: zone, exact pattern/target, inventory, overlap audit, rollback, authority.
- Lock: exact Route plus target Worker.
- Allowed: create/update/delete only the named narrow route.
- Forbidden: broad `/api/*`, overlaps, Worker deploy, D1, Pages, Shopify, providers.
- Verify: post-inventory, target, broad-route absence, safe reachability/security probes.
- Stop: overlap, wrong zone/target, inventory drift, or no rollback readiness.
- Report: route ID/pattern/target, API result, inventories, probes, adjacent state, locks.

## 9. Production browser QA

- Prerequisite: URL/deployment, matrix, safe-data policy, known write behavior.
- Lock: none for strict read-only QA; otherwise every resource the flow mutates.
- Allowed: only named paths, browsers, viewports, fixtures, and actions.
- Forbidden: customer data, uncontrolled submissions, hidden writes, unevidenced claims.
- Verify: source, screenshots/logs, console/network, scoped accessibility, final state.
- Stop: source drift, unexpected mutation, unsafe prompt, or production error.
- Report: environment, paths, evidence, matrix result, mutations, qualifications.

## 10. Controlled OTP / E2E

- Prerequisite: explicit OTP authority, approved hidden test identity, attempt limit,
  exact environment.
- Lock: every Worker, D1, provider, or other resource the flow may mutate.
- Allowed: only the bounded authorized attempts.
- Forbidden: exposing email/OTP/tokens, extra retries, customer identities, adjacent writes.
- Verify: issue/verify/terminal states, redacted D1, Download continuation, relock,
  provider outcome.
- Stop: wrong recipient, rate-limit risk, provider drift, secret exposure, unsafe partial state.
- Report: redacted attempts/outcomes, transitions, retention/cleanup, qualifications, locks.

## 11. Failure or partial production state

- Prerequisite: preserve evidence and identify the last proven good state.
- Lock: retain task-owned affected locks during safe diagnosis/authorized rollback.
- Allowed: bounded diagnosis and the pre-authorized rollback only.
- Forbidden: adjacent improvisation, false success, evidence deletion, silent lock abandonment.
- Verify: partial state, serving version, data/routes, rollback, repository state.
- Stop: no rollback authority, unclear state, ownership mismatch, widening impact.
- Report: failure point, completed actions, impact, recovery options/authority, locks.

## 12. Feishu sync handoff

- Prerequisite: formal repository trigger and completed source evidence.
- Lock: `feishu-governance:Poparooz Generator` only for an authorized Feishu write.
- Allowed: signal `FEISHU SYNC MAY BE REQUIRED`; if authorized, exact fields with readback.
- Forbidden: inferred writes/statuses, unauthorized Frozen Decision or other-system changes.
- Verify: live schema/enums, record identity, exact readback, unrelated writes zero.
- Stop: ambiguous mapping, missing record, lock conflict, unsupported transition.
- Report: trigger/evidence, records/fields, readback, per-system counts, lock release.
