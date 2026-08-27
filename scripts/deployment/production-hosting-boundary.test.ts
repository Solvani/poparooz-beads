import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, it } from "vitest";
import ts from "typescript";
import { build } from "vite";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const forbiddenWorkerRootFixtures = [
  ["src/app", "src/app/App.tsx"],
  ["src/assets", "src/assets/branding/poparooz-logo.png"],
  ["src/components", "src/components/ui/Panel.tsx"],
  ["src/config", "src/config/env.ts"],
  ["src/domain/board", "src/domain/board/index.ts"],
  ["src/domain/color", "src/domain/color/index.ts"],
  ["src/domain/image", "src/domain/image/index.ts"],
  ["src/domain/palette", "src/domain/palette/index.ts"],
  ["src/domain/pattern", "src/domain/pattern/pattern-matrix.ts"],
  ["src/domain/quantization", "src/domain/quantization/index.ts"],
  ["src/features/actions", "src/features/actions/pattern-action-state.ts"],
  [
    "src/features/bead-set-recommendation",
    "src/features/bead-set-recommendation/index.ts",
  ],
  ["src/features/download", "src/features/download/pattern-download.ts"],
  ["src/features/generator", "src/features/generator/generation-service.ts"],
  [
    "src/features/materials",
    "src/features/materials/derived-material-requirements.ts",
  ],
  [
    "src/features/pattern-canvas",
    "src/features/pattern-canvas/pattern-renderer.ts",
  ],
  ["src/features/results", "src/features/results/pattern-result-view.ts"],
  ["src/features/settings", "src/features/settings/settings-validation.ts"],
  ["src/features/upload", "src/features/upload/image-upload-validation.ts"],
  ["src/lib/browser-image", "src/lib/browser-image/index.ts"],
  ["src/lib/quantization-worker", "src/lib/quantization-worker/index.ts"],
  ["src/runtime/board-profile", "src/runtime/board-profile/index.ts"],
  [
    "src/runtime/bootstrap",
    "src/runtime/bootstrap/application-runtime-bootstrap.ts",
  ],
  ["src/runtime/color-set", "src/runtime/color-set/index.ts"],
  ["src/runtime/embed", "src/runtime/embed/generator-embed-bridge.ts"],
  [
    "src/runtime/generation-board-profile",
    "src/runtime/generation-board-profile/index.ts",
  ],
  [
    "src/runtime/generation-color-set",
    "src/runtime/generation-color-set/index.ts",
  ],
  ["src/runtime/generation-palette", "src/runtime/generation-palette/index.ts"],
  ["src/runtime/palette", "src/runtime/palette/runtime-palette.provider.ts"],
  ["src/runtime/processing-policy", "src/runtime/processing-policy/index.ts"],
  ["src/styles", "src/styles/tokens.css"],
  ["src/workers", "src/workers/quantization-worker.runtime.ts"],
] as const;

const forbiddenWorkerRoots = forbiddenWorkerRootFixtures.map(([root]) => root);

function readRepositoryFile(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

describe("production hosting boundary", () => {
  it("uses the Cloudflare Pages static _headers boundary", () => {
    const headers = readRepositoryFile("public/_headers");
    const csp = readHeader(headers, "Content-Security-Policy");

    expect(headers).toMatch(/^\/\*\r?\n/);
    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain(
      "Referrer-Policy: strict-origin-when-cross-origin",
    );
    expect(headers).toContain(
      "Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    expect(headers).not.toMatch(/^\s*X-Frame-Options:/im);
    expect(headers).not.toMatch(/^\s*Cross-Origin-Opener-Policy:/im);
    expect(headers).not.toMatch(/^\s*Cross-Origin-Embedder-Policy:/im);
    expect(csp).toContain("frame-ancestors https://poparooz.com");
    expect(csp).not.toContain("https://www.poparooz.com");
    expect(csp).not.toMatch(/frame-ancestors[^;]*\*/);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("img-src 'self' blob:");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(
      `Content-Security-Policy: ${csp}`.length,
      "Cloudflare Pages limits each _headers line to 2,000 characters",
    ).toBeLessThanOrEqual(2_000);
    for (const line of headers.split(/\r?\n/)) {
      expect(line.length).toBeLessThanOrEqual(2_000);
    }
  });

  it("copies the reviewed _headers file into the real Vite output", async () => {
    const outputDirectory = mkdtempSync(
      path.join(tmpdir(), "poparooz-cloudflare-pages-"),
    );

    try {
      await build({
        root: repositoryRoot,
        configFile: path.join(repositoryRoot, "vite.config.ts"),
        logLevel: "silent",
        build: {
          outDir: outputDirectory,
          emptyOutDir: true,
        },
      });

      expect(readFileSync(path.join(outputDirectory, "_headers"), "utf8")).toBe(
        readRepositoryFile("public/_headers"),
      );
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });

  it("allows only the frozen standalone Email Gate Worker runtime", () => {
    const forbiddenPaths = [
      "vercel.json",
      "wrangler.json",
      "wrangler.toml",
      "functions",
      "api",
      "_worker.js",
    ];

    for (const relativePath of forbiddenPaths) {
      expect(
        pathExists(relativePath),
        `${relativePath} must remain absent`,
      ).toBe(false);
    }

    const wrangler = readRepositoryFile("wrangler.jsonc");
    expect(wrangler).toContain('"name": "poparooz-email-gate-prod"');
    expect(wrangler).toContain('"main": "worker/email-gate/index.ts"');
    expect(wrangler).toContain('"workers_dev": false');
    expect(wrangler).toContain('"preview_urls": false');
    expect(wrangler).toContain('"observability"');
    expect(wrangler).not.toMatch(/"routes?"\s*:/);
    expect(wrangler).not.toMatch(/"custom_domain"\s*:/);
    expect(wrangler).not.toMatch(/"triggers"\s*:/);
    expect(wrangler).not.toMatch(/"d1_databases"\s*:/);

    const workerFiles = listFiles("worker/email-gate").filter((file) =>
      file.endsWith(".ts"),
    );
    expect(workerFiles.length).toBeGreaterThan(0);
    for (const workerFile of workerFiles) {
      const source = readRepositoryFile(workerFile);
      expect(
        findForbiddenWorkerImports(workerFile, source),
        workerFile,
      ).toEqual([]);
    }

    const frontendFiles = listFiles("src").filter((file) =>
      /\.(?:ts|tsx)$/.test(file),
    );
    for (const frontendFile of frontendFiles) {
      const source = readRepositoryFile(frontendFile);
      const workerImports = extractModuleSpecifiers(frontendFile, source)
        .map((specifier) => resolveRepositoryModule(frontendFile, specifier))
        .filter(
          (resolvedPath): resolvedPath is string =>
            resolvedPath !== null &&
            isWithinRoot(resolvedPath, "worker/email-gate"),
        );
      expect(workerImports, frontendFile).toEqual([]);
    }
  });

  it("rejects every reviewed frontend and generation root from Worker code", () => {
    const importer = "worker/email-gate/forbidden-root.fixture.ts";
    for (const [root, representativeFile] of forbiddenWorkerRootFixtures) {
      const specifier = toRelativeModuleSpecifier(importer, representativeFile);
      expect(
        findForbiddenWorkerImports(
          importer,
          `import forbiddenValue from ${JSON.stringify(specifier)};`,
        ),
        root,
      ).toEqual([{ specifier, resolvedPath: representativeFile }]);
    }
  });

  it.each([
    [
      "static import",
      (specifier: string) => `import value from ${JSON.stringify(specifier)};`,
    ],
    [
      "dynamic import",
      (specifier: string) => `void import(${JSON.stringify(specifier)});`,
    ],
    [
      "require",
      (specifier: string) => `require(${JSON.stringify(specifier)});`,
    ],
    [
      "named export",
      (specifier: string) =>
        `export { value } from ${JSON.stringify(specifier)};`,
    ],
    [
      "star export",
      (specifier: string) => `export * from ${JSON.stringify(specifier)};`,
    ],
  ])("resolves and rejects %s syntax", (_label, renderSource) => {
    const importer = "worker/email-gate/import-syntax.fixture.ts";
    const representativeFile = "src/domain/pattern/pattern-matrix.ts";
    const specifier = toRelativeModuleSpecifier(importer, representativeFile);
    expect(
      findForbiddenWorkerImports(importer, renderSource(specifier)),
    ).toEqual([{ specifier, resolvedPath: representativeFile }]);
  });

  it("allows Email Gate, shared contract, and external imports without comment or string false positives", () => {
    const importer = "worker/email-gate/providers/allowed.fixture.ts";
    const source = `
      import { z } from "zod";
      import type { FetchPort } from "../runtime-ports";
      export { EMAIL_GATE_CHALLENGE_PATH } from "../../../src/contracts/email-gate/email-gate-contract";
      // import "../../../src/domain/pattern";
      const documentation = "require('../../../src/features/download')";
      void documentation;
    `;
    expect(findForbiddenWorkerImports(importer, source)).toEqual([]);
  });

  it("freezes only the approved HTTPS production identities", () => {
    const productionEnvironment = readRepositoryFile(".env.production");

    expect(productionEnvironment.trim().split(/\r?\n/)).toEqual([
      "VITE_SHOP_URL=https://poparooz.com",
      "VITE_GENERATOR_PUBLIC_URL=https://generator.poparooz.com",
      "VITE_ALLOWED_PARENT_ORIGINS=https://poparooz.com",
    ]);
    expect(productionEnvironment).not.toMatch(/http:\/\//);
    expect(productionEnvironment).not.toMatch(/localhost|127\.0\.0\.1|\*/);
    expect(productionEnvironment).not.toContain("https://www.poparooz.com");
  });

  it("keeps the Shopify embed exact-origin, responsive, and capability-minimal", () => {
    const snippet = readRepositoryFile(
      "docs/shopify/poparooz-generator-embed.liquid",
    );

    expect(snippet).toContain('src="https://generator.poparooz.com/"');
    expect(snippet).toContain("width: 100%");
    expect(snippet).toContain(
      'sandbox="allow-scripts allow-same-origin allow-downloads"',
    );
    expect(snippet).not.toMatch(/allow-popups|allow-top-navigation/);
    expect(snippet).toContain(
      'const generatorOrigin = "https://generator.poparooz.com"',
    );
    expect(snippet).toContain("event.origin !== generatorOrigin");
    expect(snippet).toContain("event.source !== frame.contentWindow");
    expect(snippet).toContain("event.data.version !== 1");
    expect(snippet).toContain('event.data.type !== "generator.resize"');
    expect(snippet).toContain("height < 320 || height > 8192");
    expect(snippet).toContain("Open Pattern Maker Full Screen");
    expect(snippet).not.toContain("postMessage(");
  });
});

function readHeader(source: string, name: string): string {
  const line = source
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}:`));
  if (line === undefined) throw new Error(`Missing ${name} header.`);
  return line.slice(line.indexOf(":") + 1).trim();
}

function pathExists(relativePath: string): boolean {
  return existsSync(path.join(repositoryRoot, relativePath));
}

function listFiles(relativeDirectory: string): string[] {
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory);
  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap(
    (entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      return entry.isDirectory() ? listFiles(relativePath) : [relativePath];
    },
  );
}

function findForbiddenWorkerImports(
  importer: string,
  source: string,
): ReadonlyArray<Readonly<{ specifier: string; resolvedPath: string }>> {
  return extractModuleSpecifiers(importer, source).flatMap((specifier) => {
    const resolvedPath = resolveRepositoryModule(importer, specifier);
    if (resolvedPath === null) {
      return specifier.startsWith(".")
        ? [{ specifier, resolvedPath: "<unresolved-relative-import>" }]
        : [];
    }
    return forbiddenWorkerRoots.some((root) => isWithinRoot(resolvedPath, root))
      ? [{ specifier, resolvedPath }]
      : [];
  });
}

function extractModuleSpecifiers(importer: string, source: string): string[] {
  const scriptKind = importer.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    importer,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const specifiers: string[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]!) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0]!.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function resolveRepositoryModule(
  importer: string,
  specifier: string,
): string | null {
  const importerPath = path.join(repositoryRoot, importer);
  const resolved = ts.resolveModuleName(
    specifier,
    importerPath,
    {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      resolveJsonModule: true,
    },
    ts.sys,
  ).resolvedModule?.resolvedFileName;
  const fallback =
    resolved === undefined && specifier.startsWith(".")
      ? resolveExistingRelativeModule(importerPath, specifier)
      : undefined;
  const absolutePath = resolved ?? fallback;
  if (absolutePath === undefined) return null;

  const relativePath = normalizePath(
    path.relative(repositoryRoot, absolutePath),
  );
  return relativePath.startsWith("../") ? null : relativePath;
}

function resolveExistingRelativeModule(
  importerPath: string,
  specifier: string,
): string | undefined {
  const candidate = path.resolve(path.dirname(importerPath), specifier);
  for (const suffix of ["", ".ts", ".tsx", ".js", ".json", "/index.ts"]) {
    const possiblePath = `${candidate}${suffix}`;
    if (existsSync(possiblePath)) return possiblePath;
  }
  return undefined;
}

function toRelativeModuleSpecifier(importer: string, target: string): string {
  const relativePath = normalizePath(
    path.relative(path.dirname(importer), target),
  );
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function isWithinRoot(relativePath: string, root: string): boolean {
  return relativePath === root || relativePath.startsWith(`${root}/`);
}

function normalizePath(filePath: string): string {
  return filePath.replaceAll(path.sep, "/");
}
