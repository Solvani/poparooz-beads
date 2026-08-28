import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const frontendCompilerOptions = loadFrontendCompilerOptions(repositoryRoot);
const TEST_MODULE_PATTERN = /\.(?:test|spec)\.tsx?$/i;
const TEST_DIRECTORY_NAMES = new Set(["test", "tests", "__tests__"]);
const FRONTEND_ASSET_PATTERN = /\.(?:css|png|jpe?g|gif|svg|webp|avif)$/i;

describe("Email Gate production boundary", () => {
  it("injects only the unavailable capability from the production entry", () => {
    const main = readFileSync(
      path.join(repositoryRoot, "src/main.tsx"),
      "utf8",
    );
    expect(main).toContain(
      "emailGateCapability={UNAVAILABLE_EMAIL_GATE_CAPABILITY}",
    );
    expect(main).not.toMatch(
      /VITE_.*EMAIL_GATE|createEmailGateBrowserClient|createBrowserEmailGateUnlockStore/,
    );
  });

  it("keeps every discovered frontend production module independent from server internals", () => {
    const productionFiles = discoverProtectedProductionModules(repositoryRoot);
    expect(productionFiles).toEqual([...productionFiles].sort());
    expect(productionFiles).toEqual(
      expect.arrayContaining([
        path.join(repositoryRoot, "src/app/App.tsx"),
        path.join(repositoryRoot, "src/main.tsx"),
      ]),
    );

    for (const file of productionFiles) {
      const source = readFileSync(file, "utf8");
      expect(
        findBoundaryViolations(file, source, {
          repositoryRoot,
          compilerOptions: frontendCompilerOptions,
        }),
        path.relative(repositoryRoot, file),
      ).toEqual([]);
    }
  });

  it("recursively discovers production modules and excludes test-only modules", () => {
    withTemporaryDirectory((fixtureRoot) => {
      const emailGateRoot = path.join(fixtureRoot, "src/email-gate");
      writeFixture(emailGateRoot, "root.ts", "export {};\n");
      writeFixture(emailGateRoot, "nested/view.tsx", "export {};\n");
      writeFixture(emailGateRoot, "root.test.ts", "export {};\n");
      writeFixture(emailGateRoot, "root.test.tsx", "export {};\n");
      writeFixture(emailGateRoot, "root.spec.ts", "export {};\n");
      writeFixture(emailGateRoot, "root.spec.tsx", "export {};\n");
      writeFixture(emailGateRoot, "test/helper.ts", "export {};\n");
      writeFixture(emailGateRoot, "__tests__/helper.tsx", "export {};\n");

      expect(discoverEmailGateProductionModules(emailGateRoot)).toEqual([
        path.join(emailGateRoot, "nested/view.tsx"),
        path.join(emailGateRoot, "root.ts"),
      ]);
    });
  });

  it.each([
    ["dot segment", "../../worker/./email-gate/handler"],
    ["parent segment", "../../worker/other/../email-gate/handler"],
    ["explicit extension", "../../worker/email-gate/handler.ts"],
    ["extensionless", "../../worker/email-gate/handler"],
    ["index module", "../../worker/email-gate/index"],
    ["duplicate separators", "../../worker//email-gate/handler"],
    ["Windows separators", "..\\..\\worker\\email-gate\\handler"],
  ])(
    "rejects a forbidden canonical target reached through %s",
    (_name, specifier) => {
      withResolutionFixture(({ importer, context }) => {
        const source = `import value from ${JSON.stringify(specifier)};`;
        expect(findBoundaryViolations(importer, source, context)).toHaveLength(
          1,
        );
      });
    },
  );

  it("allows a legitimate frontend target after parent and dot normalization", () => {
    withResolutionFixture(({ importer, context }) => {
      const source = 'import value from "../shared/./allowed";';
      expect(findBoundaryViolations(importer, source, context)).toEqual([]);
    });
  });

  it("rejects a resolved relative code target outside the canonical repository root", () => {
    withResolutionFixture(({ importer, context, outsideRoot }) => {
      const outside = writeFixture(
        outsideRoot,
        "outside.ts",
        "export default 1;\n",
      );
      const resolved = resolveModule("../../../outside", importer, context);

      expect(resolved).toBeDefined();
      expect(canonicalizeExistingPath(resolved!.resolvedFileName)).toBe(
        canonicalizeExistingPath(outside),
      );
      expect(
        findBoundaryViolations(
          importer,
          'import value from "../../../outside";',
          context,
        ),
      ).toEqual([expect.stringContaining("outside repository")]);
    });
  });

  it.each([
    ["literal dynamic import", 'const module = import("../../../outside");'],
    [
      "no-substitution dynamic import",
      "const module = import(`../../../outside`);",
    ],
    ["literal require", 'const module = require("../../../outside");'],
    ["no-substitution require", "const module = require(`../../../outside`);"],
    ["named re-export", 'export { value } from "../../../outside";'],
    ["star re-export", 'export * from "../../../outside";'],
  ])("rejects a resolved outside-repository %s", (_name, source) => {
    withResolutionFixture(({ importer, context, outsideRoot }) => {
      writeFixture(
        outsideRoot,
        "outside.ts",
        "export default 1; export const value = 1;\n",
      );
      expect(findBoundaryViolations(importer, source, context)).toEqual([
        expect.stringContaining("outside repository"),
      ]);
    });
  });

  it("rejects an absolute filesystem code target outside the repository", () => {
    withResolutionFixture(({ importer, context, outsideRoot }) => {
      const outside = writeFixture(
        outsideRoot,
        "absolute-outside.ts",
        "export default 1;\n",
      );
      const source = `import value from ${JSON.stringify(outside)};`;
      const resolved = resolveModule(outside, importer, context);

      expect(resolved).toBeDefined();
      expect(findBoundaryViolations(importer, source, context)).toEqual([
        expect.stringContaining("outside repository"),
      ]);
    });
  });

  it("allows an installed bare third-party package dependency", () => {
    const importer = path.join(
      repositoryRoot,
      "src/email-gate/email-gate-capability.ts",
    );
    const context = {
      repositoryRoot,
      compilerOptions: frontendCompilerOptions,
    };
    const resolved = resolveModule("react", importer, context);

    expect(resolved?.isExternalLibraryImport).toBe(true);
    expect(
      findBoundaryViolations(importer, 'import React from "react";', context),
    ).toEqual([]);
  });

  it("fails closed for an unresolved relative code dependency", () => {
    withResolutionFixture(({ importer, context }) => {
      expect(
        findBoundaryViolations(
          importer,
          'import value from "./does-not-exist";',
          context,
        ),
      ).toEqual([expect.stringContaining("unresolved local target")]);
    });
  });

  it("rejects a path inside the repository that realpaths through a junction outside it", () => {
    withResolutionFixture(({ importer, context, outsideRoot }) => {
      const externalDirectory = path.join(outsideRoot, "junction-target");
      writeFixture(externalDirectory, "outside.ts", "export default 1;\n");
      const link = path.join(context.repositoryRoot, "src/email-gate/link");
      symlinkSync(
        externalDirectory,
        link,
        process.platform === "win32" ? "junction" : "dir",
      );

      const resolved = resolveModule("./link/outside", importer, context);
      expect(resolved).toBeDefined();
      expect(canonicalizeExistingPath(resolved!.resolvedFileName)).toBe(
        canonicalizeExistingPath(path.join(externalDirectory, "outside.ts")),
      );
      expect(
        findBoundaryViolations(
          importer,
          'import value from "./link/outside";',
          context,
        ),
      ).toEqual([expect.stringContaining("outside repository")]);
    });
  });

  it.each([
    [
      "single-line import",
      'import value from "../../worker/email-gate/handler";',
    ],
    [
      "multiline import",
      'import {\n  value,\n} from "../../worker/email-gate/handler";',
    ],
    [
      "named re-export",
      'export { value } from "../../worker/email-gate/handler";',
    ],
    ["star re-export", 'export * from "../../worker/email-gate/handler";'],
    [
      "dynamic import literal",
      'const module = import("../../worker/email-gate/handler");',
    ],
    [
      "dynamic import no-substitution template",
      "const module = import(`../../worker/email-gate/handler`);",
    ],
    [
      "CommonJS require literal",
      'const module = require("../../worker/email-gate/handler");',
    ],
    [
      "CommonJS require no-substitution template",
      "const module = require(`../../worker/email-gate/handler`);",
    ],
  ])("rejects a forbidden resolved %s", (_name, source) => {
    withResolutionFixture(({ importer, context }) => {
      expect(findBoundaryViolations(importer, source, context)).toHaveLength(1);
    });
  });

  it.each([
    ["computed dynamic import", "const module = import(target);"],
    ["interpolated dynamic import", "const module = import(`./${target}`);"],
    ["computed require", "const module = require(target);"],
  ])("fails closed for a %s", (_name, source) => {
    withResolutionFixture(({ importer, context }) => {
      expect(findBoundaryViolations(importer, source, context)).toEqual([
        expect.stringContaining("computed module target"),
      ]);
    });
  });

  it("rejects the Cloudflare server runtime namespace", () => {
    withResolutionFixture(({ importer, context }) => {
      const source = 'const module = require("cloudflare:workers");';
      expect(findBoundaryViolations(importer, source, context)).toHaveLength(1);
    });
  });

  it("keeps Gate presentation assets out of the eager application graph", () => {
    const appPath = path.join(repositoryRoot, "src/app/App.tsx");
    const app = readFileSync(appPath, "utf8");
    const styles = readFileSync(
      path.join(repositoryRoot, "src/styles.css"),
      "utf8",
    );
    const appDependencies = collectModuleDependencies(appPath, app);
    const staticSpecifiers = appDependencies
      .filter((dependency) => dependency.kind === "static")
      .map((dependency) => dependency.specifier);
    const dynamicSpecifiers = appDependencies
      .filter((dependency) => dependency.kind === "dynamic")
      .map((dependency) => dependency.specifier);

    expect(staticSpecifiers).not.toContain("../email-gate/EmailGateDialog");
    expect(dynamicSpecifiers).toContain("../email-gate/EmailGateDialog");
    expect(styles).not.toContain("email-gate/email-gate.css");
    expect(app).toContain("EmailGatePresentationBoundary");
  });
});

interface BoundaryContext {
  readonly repositoryRoot: string;
  readonly compilerOptions: ts.CompilerOptions;
}

type ResolvedTargetClass =
  | "repository-allowed"
  | "repository-forbidden"
  | "external-package"
  | "outside-repository-code";

type ModuleDependency = Readonly<{
  kind: "static" | "dynamic" | "require";
  specifier: string | null;
}>;

function loadFrontendCompilerOptions(root: string): ts.CompilerOptions {
  const configPath = path.join(root, "tsconfig.app.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new Error(formatTypeScriptDiagnostic(config.error));
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  );
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map(formatTypeScriptDiagnostic).join("\n"));
  }
  return parsed.options;
}

function formatTypeScriptDiagnostic(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function discoverProtectedProductionModules(root: string): string[] {
  return [
    ...discoverEmailGateProductionModules(path.join(root, "src/email-gate")),
    path.join(root, "src/app/App.tsx"),
    path.join(root, "src/main.tsx"),
  ].sort();
}

function discoverEmailGateProductionModules(emailGateRoot: string): string[] {
  const files: string[] = [];

  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    )) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!TEST_DIRECTORY_NAMES.has(entry.name.toLowerCase())) visit(target);
      } else if (
        entry.isFile() &&
        /\.tsx?$/i.test(entry.name) &&
        !TEST_MODULE_PATTERN.test(entry.name)
      ) {
        files.push(target);
      }
    }
  }

  visit(emailGateRoot);
  return files.sort();
}

function findBoundaryViolations(
  file: string,
  source: string,
  context: BoundaryContext,
): string[] {
  const violations: string[] = [];
  for (const dependency of collectModuleDependencies(file, source)) {
    if (dependency.specifier === null) {
      violations.push(`${dependency.kind}: computed module target`);
      continue;
    }
    if (dependency.specifier.startsWith("cloudflare:")) {
      violations.push(`${dependency.kind}: ${dependency.specifier}`);
      continue;
    }
    const resolved = resolveModule(dependency.specifier, file, context);
    if (resolved === undefined) {
      if (
        isFilesystemCodeSpecifier(dependency.specifier) &&
        !FRONTEND_ASSET_PATTERN.test(dependency.specifier)
      ) {
        violations.push(
          `${dependency.kind}: unresolved local target ${dependency.specifier}`,
        );
      }
      continue;
    }
    const canonicalTarget = canonicalizeExistingPath(resolved.resolvedFileName);
    const targetClass = classifyResolvedTarget(
      dependency.specifier,
      resolved,
      canonicalTarget,
      context.repositoryRoot,
    );
    if (targetClass === "repository-forbidden") {
      violations.push(
        `${dependency.kind}: ${dependency.specifier} -> ${canonicalTarget}`,
      );
    } else if (targetClass === "outside-repository-code") {
      violations.push(
        `${dependency.kind}: resolved local target outside repository ${dependency.specifier} -> ${canonicalTarget}`,
      );
    }
  }
  return violations;
}

function resolveModule(
  specifier: string,
  file: string,
  context: BoundaryContext,
): ts.ResolvedModuleFull | undefined {
  return ts.resolveModuleName(specifier, file, context.compilerOptions, ts.sys)
    .resolvedModule;
}

function canonicalizeExistingPath(target: string): string {
  const absolute = path.resolve(target);
  try {
    return path.normalize(realpathSync.native(absolute));
  } catch {
    return path.normalize(absolute);
  }
}

function classifyResolvedTarget(
  specifier: string,
  resolved: ts.ResolvedModuleFull,
  canonicalTarget: string,
  root: string,
): ResolvedTargetClass {
  const canonicalRoot = canonicalizeExistingPath(root);
  const relative = path.relative(canonicalRoot, canonicalTarget);
  const insideRepository =
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);

  if (!insideRepository) {
    return resolved.isExternalLibraryImport === true &&
      !isFilesystemCodeSpecifier(specifier)
      ? "external-package"
      : "outside-repository-code";
  }

  const segments = relative.split(/[\\/]+/);
  if (segments[0]?.toLowerCase() === "worker") {
    return "repository-forbidden";
  }
  return resolved.isExternalLibraryImport === true &&
    !isFilesystemCodeSpecifier(specifier)
    ? "external-package"
    : "repository-allowed";
}

function isFilesystemCodeSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith(".") ||
    path.isAbsolute(specifier) ||
    path.win32.isAbsolute(specifier) ||
    path.posix.isAbsolute(specifier)
  );
}

function collectModuleDependencies(
  file: string,
  source: string,
): ModuleDependency[] {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const dependencies: ModuleDependency[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined
    ) {
      dependencies.push({
        kind: "static",
        specifier: literalModuleSpecifier(node.moduleSpecifier),
      });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      dependencies.push({
        kind: "dynamic",
        specifier:
          node.arguments.length === 1
            ? literalModuleSpecifier(node.arguments[0]!)
            : null,
      });
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      dependencies.push({
        kind: "require",
        specifier:
          node.arguments.length === 1
            ? literalModuleSpecifier(node.arguments[0]!)
            : null,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return dependencies;
}

function literalModuleSpecifier(node: ts.Node): string | null {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : null;
}

function withResolutionFixture(
  run: (fixture: {
    readonly importer: string;
    readonly context: BoundaryContext;
    readonly outsideRoot: string;
  }) => void,
): void {
  withTemporaryDirectory((outsideRoot) => {
    const fixtureRoot = path.join(outsideRoot, "repo");
    const importer = writeFixture(
      fixtureRoot,
      "src/email-gate/fixture.ts",
      "export {};\n",
    );
    writeFixture(fixtureRoot, "src/shared/allowed.ts", "export default 1;\n");
    writeFixture(
      fixtureRoot,
      "worker/email-gate/handler.ts",
      "export default 1; export const value = 1;\n",
    );
    writeFixture(
      fixtureRoot,
      "worker/email-gate/index.ts",
      "export default 1;\n",
    );
    mkdirSync(path.join(fixtureRoot, "worker/other"), { recursive: true });
    run({
      importer,
      context: {
        repositoryRoot: fixtureRoot,
        compilerOptions: frontendCompilerOptions,
      },
      outsideRoot,
    });
  });
}

function withTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "poparooz-gate-boundary-"),
  );
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function writeFixture(root: string, relative: string, source: string): string {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, source, "utf8");
  return target;
}
