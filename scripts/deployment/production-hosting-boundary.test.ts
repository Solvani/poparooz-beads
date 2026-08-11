import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { build } from "vite";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

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

  it("does not introduce a server or vendor-specific runtime", () => {
    const forbiddenPaths = [
      "vercel.json",
      "wrangler.json",
      "wrangler.jsonc",
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
