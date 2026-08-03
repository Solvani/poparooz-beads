# Repository Agent Rules

This file contains durable repository-wide rules for Codex and other coding agents. Current accepted project state belongs in `docs/PROJECT_STATE.md`, not here.

## 1. Required Context

Before editing:

1. Read this file and `docs/PROJECT_STATE.md`.
2. Read `package.json`, the relevant source files, governing documents, and tests.
3. Check the current branch, HEAD, and worktree.
4. Confirm that the task does not conflict with a frozen or unauthorized area.

Stop and report the conflict when:

- the worktree contains unexpected changes;
- instructions conflict;
- the task requires changing an unauthorized frozen area; or
- actual repository state differs from the task baseline.

Instruction precedence is:

```text
explicit task-specific requirements
> AGENTS.md repository rules
> docs/PROJECT_STATE.md state record
```

A task prompt cannot implicitly override brand, privacy, or Git safety boundaries. Such an override must be explicit and authorized.

## 2. Product Boundaries

- This repository contains the fuse-bead pattern generator for the Poparooz United States Shopify store.
- Poparooz is the only customer-visible brand.
- `MARD` may remain only in historical internal-reference or compatibility data.
- Never expose a third-party brand, supplier identity, or internal Palette field to customers.
- `M1` through `M15` are Poparooz-owned M-series customer color codes.

## 3. Privacy

- User images must remain in the browser.
- Do not upload or remotely persist user images.
- Do not add server-side image processing.
- Do not log image contents or send image data to analytics services.
- Do not introduce a network dependency into the core generation path.

Changing these boundaries requires explicit product and architecture authorization.

## 4. Scope Discipline

- Implement only the current authorized task.
- Do not perform unrelated refactors, renames, formatting sweeps, dependency upgrades, architecture migrations, UI redesigns, or documentation rewrites.
- Do not modify frozen modules without explicit authorization.
- Prefer existing types, components, utilities, design tokens, and test patterns.
- Make the smallest complete change that satisfies the acceptance criteria.

## 5. Dependencies and Type Safety

- Use the repository's existing package manager and lockfile.
- Do not add or upgrade production dependencies without explicit approval.
- Do not use broad `any`, unsafe casts, error suppression, or silent fallback behavior to bypass a problem.
- Do not delete, skip, or weaken unrelated tests merely to obtain a passing result.

## 6. Customer-Facing UI

- Customer-facing copy defaults to English.
- Preserve the existing Poparooz Design System.
- UI changes must cover affected desktop, mobile, keyboard, and accessibility states.
- Do not invent brand, performance, safety, color-accuracy, or compliance claims.
- Do not casually rewrite the frozen Phase 2 UI.

## 7. Git Safety

At task start and completion, check:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
```

Unless the task explicitly authorizes it, do not run:

```text
git add
git commit
git push
git pull
git merge
git rebase
git reset
git clean
git switch
git checkout
git tag
```

Never discard user changes, overwrite unexpected worktree content, rewrite history, modify remotes, or automatically repair an `origin/main [gone]` state.

## 8. Verification

- Use only repository-provided scripts and tools.
- Run targeted tests and, when appropriate to the change, the full suite, production build, TypeScript checks, lint, and formatting checks.
- A documentation-only task should not run unrelated full tests merely for formality; report that they were not run because no code changed.
- Before completion, run:

```bash
git diff --check
git diff --stat
git status --short
```

Do not claim browser, mobile-device, visual, or assistive-technology validation that was not actually performed.

## 9. Definition of Done

A task is ready for review only when:

- the requested behavior is implemented;
- acceptance criteria are satisfied;
- necessary tests are added or updated;
- required checks pass, or failures are reported accurately;
- the final diff has been reviewed;
- no unrelated changes are present; and
- no unauthorized commit or push occurred.

A Codex report of completion does not mean that project control has accepted or frozen the task.

## 10. Completion Report

Every final report must include:

```text
Task
Implementation
Changed files
Verification
Checks not run
Risks
Git state
```

Git state must report:

- branch;
- HEAD;
- worktree status;
- `git diff --stat`;
- whether a commit was performed; and
- whether a push was performed.
