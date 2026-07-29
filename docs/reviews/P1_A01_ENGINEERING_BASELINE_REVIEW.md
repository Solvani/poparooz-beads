# P1-A01 Engineering Baseline Review

Review date: **2026-07-29**

Result: **Accepted with follow-up**

## Scope

P1-A01 establishes only the frontend engineering baseline. It does not
implement domain schemas, a MARD palette, image processing, color algorithms,
Web Workers, Canvas, exports, iframe messaging, deployment, or Shopify changes.

## Engineering choices

- React, TypeScript, and Vite provide the browser application baseline.
- TypeScript production, Node configuration, and test contexts are checked
  separately so test globals do not enter production compilation.
- ESLint uses flat configuration with TypeScript plus React Hooks and React
  Refresh rules for the React source. Prettier owns formatting rules and is
  integrated without competing ESLint formatting rules.
- Vitest uses jsdom with React Testing Library, jest-dom, and user-event
  available for component behavior tests.
- Environment values are read only through `src/config/env.ts`. Empty values
  are valid during baseline development; configured URLs must use HTTP(S), and
  parent allowlist entries must be exact origins.

## Installed dependency baseline

| Area            | Packages and resolved versions                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Runtime         | React 19.2.8, React DOM 19.2.8                                                                  |
| Build and types | TypeScript 6.0.3, Vite 8.1.5, React plugin 6.0.4                                                |
| Lint and format | ESLint 10.8.0, typescript-eslint 8.65.0, React Hooks 7.1.1, React Refresh 0.5.3, Prettier 3.9.6 |
| Tests           | Vitest 4.1.10, jsdom 29.1.1, Testing Library React 16.3.2, jest-dom 7.0.0, user-event 14.6.1    |

The complete transitive dependency graph is reproducibly recorded in
`package-lock.json`. The final npm audit covers 239 installed packages and
reports zero known vulnerabilities.

## Source boundaries

| Path           | Responsibility                                       |
| -------------- | ---------------------------------------------------- |
| `src/app`      | Application shell and top-level React error boundary |
| `src/config`   | Central environment parsing and validation           |
| `src/test`     | Shared test-environment setup                        |
| `src/main.tsx` | Browser entry point                                  |

No empty `components`, `domain`, `features`, `lib`, or `public` directory is
created before it has an implementation need.

## Scripts

| Script                 | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Vite development server                              |
| `npm run build`        | Production Vite build                                |
| `npm run typecheck`    | Independent production, Node-config, and test checks |
| `npm run lint`         | ESLint across source and configuration               |
| `npm run format`       | Apply Prettier formatting                            |
| `npm run format:check` | Verify formatting without changing files             |
| `npm test`             | Vitest watch mode                                    |
| `npm run test:run`     | Single Vitest run for CI                             |

## Test baseline

The suite covers the placeholder application, the render error fallback, empty
development configuration, valid URL/origin normalization, and invalid
URL/origin rejection. Browser end-to-end testing is deferred to P3-A11 because
P1-A01 has no real user workflow and Playwright would add browser downloads and
maintenance without meaningful coverage at this stage.

## Verification evidence

| Command                                                    | Result                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm install`                                              | Passed; lock file reproduced and 239 packages audited with zero vulnerabilities |
| `npm run dev -- --host 127.0.0.1 --port 4173 --strictPort` | Vite ready in 185 ms; stopped by the intentional bounded smoke-test timeout     |
| `npm run build`                                            | Passed; 17 modules transformed and production output generated                  |
| `npm run typecheck`                                        | Passed for application, Node configuration, and tests                           |
| `npm run lint`                                             | Passed with no warnings                                                         |
| `npm run format:check`                                     | Passed                                                                          |
| `npm run test:run`                                         | Passed; 3 test files and 6 tests                                                |
| `git diff --check`                                         | Passed                                                                          |

## Known limitations and follow-up

- `docs/POPAROOZ_MARD_PALETTE_CONTRACT.md`, named in the P1-A01 brief, was not
  present at the initial commit. The authoritative palette boundary remains in
  `POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md`; no palette work is performed here.
- The machine PATH did not expose Node or npm. Checks used the bundled Node
  runtime and a temporary npm 11 runner; normal contributors must install the
  prerequisites in the README.
- Remote branch verification still fails because the available Git installation
  cannot invoke its HTTPS remote helper. This does not affect local P1-A01 work,
  but remote access and `origin/main` must be resolved before the first push.
- Production environment values remain deliberately unset. Their verified
  values are later deployment dependencies.

## P1-A02 entry condition

P1-A02 may begin only after this commit is separately accepted and the complete
P1-A01 check set passes. P1-A02 must remain limited to domain schemas, runtime
validation, and the MARD palette contract; it must not import production palette
data or later algorithm/UI work.
