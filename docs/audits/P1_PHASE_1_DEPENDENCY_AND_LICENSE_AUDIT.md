# Phase 1 Dependency and License Audit

Audit date: 2026-07-30. Scope: direct runtime and development dependencies declared by `package.json` and installed by `package-lock.json`. Versions and license identifiers below come from each installed package's `package.json`; this is an engineering inventory, not legal advice or a substitute for reviewing distributed license texts.

Source for every row: installed `node_modules/<package>/package.json`, reconciled to the direct declaration and lockfile. Risk note for every row: declared identifier only; transitive packages, notices, attribution, and distribution duties require release review. Release recheck: **Yes** for every row, using a current registry/security and full license-text review.

| Dependency                  | Installed version | Use                           | Declared license |
| --------------------------- | ----------------: | ----------------------------- | ---------------- |
| react                       |            19.2.8 | runtime                       | MIT              |
| react-dom                   |            19.2.8 | runtime                       | MIT              |
| zod                         |             4.4.3 | runtime validation            | MIT              |
| @eslint/js                  |            10.0.1 | development                   | MIT              |
| @testing-library/jest-dom   |             7.0.0 | development/test              | MIT              |
| @testing-library/react      |            16.3.2 | development/test              | MIT              |
| @testing-library/user-event |            14.6.1 | development/test              | MIT              |
| @types/node                 |            26.1.2 | development/types             | MIT              |
| @types/react                |           19.2.17 | development/types             | MIT              |
| @types/react-dom            |            19.2.3 | development/types             | MIT              |
| @vitejs/plugin-react        |             6.0.4 | development/build             | MIT              |
| csv-parse                   |             7.0.1 | development/import validation | MIT              |
| eslint                      |            10.8.0 | development                   | MIT              |
| eslint-config-prettier      |            10.1.8 | development                   | MIT              |
| eslint-plugin-react-hooks   |             7.1.1 | development                   | MIT              |
| eslint-plugin-react-refresh |             0.5.3 | development                   | MIT              |
| globals                     |            17.8.0 | development                   | MIT              |
| jsdom                       |            29.1.1 | development/test              | MIT              |
| prettier                    |             3.9.6 | development                   | MIT              |
| typescript                  |             6.0.3 | development                   | Apache-2.0       |
| typescript-eslint           |            8.65.0 | development                   | MIT              |
| vite                        |             8.1.5 | development/build             | MIT              |
| vitest                      |            4.1.10 | development/test              | MIT              |

No AGPL dependency is declared directly. No external repository code, copied source, or new dependency was introduced by P1-A10. The application remains proprietary. Transitive dependency status is lockfile-controlled but must be re-audited before a production distribution; registry vulnerability/license refresh was not available in this local evidence run. Any future dependency or copied code requires URL, exact version/commit, license and notice review before use.

> Upstream open-source project code has not been imported. Any future code import must complete license review first.
