import { execFileSync } from "node:child_process";

export const D04_A01_AUTHORIZED_PRODUCTION_BASELINE =
  "9b411803afb26d618abe94f411b1bb342099fb14";

const PRODUCTION_ROOT_FILES = new Set([
  "index.html",
  "package-lock.json",
  "package.json",
  "tsconfig.app.json",
  "tsconfig.json",
  "vite.config.ts",
]);

export interface ProductionBaselineState {
  readonly authorizedProductionBaseline: string;
  readonly recordedProductionBaseline: string;
  readonly currentRepositoryHead: string;
  readonly authorizedBaselineExists: boolean;
  readonly authorizedBaselineIsAncestor: boolean;
  readonly changedPaths: readonly string[];
}

export function verifyProductionBaselineLifecycle(
  repositoryRoot: string,
  recordedProductionBaseline: string,
): Readonly<ProductionBaselineState> {
  const authorizedProductionBaseline = D04_A01_AUTHORIZED_PRODUCTION_BASELINE;
  const currentRepositoryHead = git(repositoryRoot, ["rev-parse", "HEAD"]);
  const authorizedBaselineExists = gitSucceeds(repositoryRoot, [
    "cat-file",
    "-e",
    `${authorizedProductionBaseline}^{commit}`,
  ]);
  const authorizedBaselineIsAncestor =
    authorizedBaselineExists &&
    gitSucceeds(repositoryRoot, [
      "merge-base",
      "--is-ancestor",
      authorizedProductionBaseline,
      currentRepositoryHead,
    ]);
  const changedPaths = authorizedBaselineExists
    ? uniqueSorted([
        ...gitLines(repositoryRoot, [
          "diff",
          "--name-only",
          `${authorizedProductionBaseline}..${currentRepositoryHead}`,
        ]),
        ...gitLines(repositoryRoot, ["diff", "--name-only"]),
        ...gitLines(repositoryRoot, ["diff", "--cached", "--name-only"]),
        ...gitLines(repositoryRoot, [
          "ls-files",
          "--others",
          "--exclude-standard",
        ]),
      ])
    : [];
  const state = Object.freeze({
    authorizedProductionBaseline,
    recordedProductionBaseline,
    currentRepositoryHead,
    authorizedBaselineExists,
    authorizedBaselineIsAncestor,
    changedPaths: Object.freeze(changedPaths),
  });
  assertProductionBaselineState(state);
  return state;
}

export function assertProductionBaselineState(
  state: ProductionBaselineState,
): void {
  if (state.recordedProductionBaseline !== state.authorizedProductionBaseline) {
    throw new Error("Recorded D04-A01 production baseline differs.");
  }
  if (!state.authorizedBaselineExists) {
    throw new Error("Authorized D04-A01 production baseline is missing.");
  }
  if (!state.authorizedBaselineIsAncestor) {
    throw new Error(
      "Current repository HEAD does not descend from the authorized production baseline.",
    );
  }
  const productionDrift = state.changedPaths.filter(
    isProductionAuthoritativePath,
  );
  if (productionDrift.length > 0) {
    throw new Error(
      `Production-authoritative content differs from the D04-A01 baseline: ${productionDrift.join(", ")}`,
    );
  }
}

export function assertExactEvidenceIdentity(
  actual: string,
  expected: string,
  label: string,
): void {
  if (actual !== expected) {
    throw new Error(`${label} is not deterministic.`);
  }
}

export function isProductionAuthoritativePath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  return (
    normalized === "src" ||
    normalized.startsWith("src/") ||
    normalized === "public" ||
    normalized.startsWith("public/") ||
    PRODUCTION_ROOT_FILES.has(normalized)
  );
}

function git(repositoryRoot: string, arguments_: readonly string[]): string {
  return execFileSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}

function gitLines(
  repositoryRoot: string,
  arguments_: readonly string[],
): readonly string[] {
  const output = git(repositoryRoot, arguments_);
  return output === "" ? [] : output.split(/\r?\n/u);
}

function gitSucceeds(
  repositoryRoot: string,
  arguments_: readonly string[],
): boolean {
  try {
    execFileSync("git", arguments_, { cwd: repositoryRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
