import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertAuthoritativeBaselineWriteAllowed,
  FROZEN_GENERATOR_QUALITY_FILES,
  verifyFrozenGeneratorQualityFiles,
} from "./generator-quality-baseline.ts";
import { parseGeneratorQualityManifest } from "./generator-quality-manifest.ts";

const repositoryRoot = process.cwd();

describe("generator quality harness boundaries", () => {
  it("keeps frozen artifacts byte-identical", () => {
    expect(verifyFrozenGeneratorQualityFiles(repositoryRoot)).toEqual({
      runtimePaletteArtifact:
        FROZEN_GENERATOR_QUALITY_FILES.runtimePaletteArtifact.sha256,
      runtimePaletteLock:
        FROZEN_GENERATOR_QUALITY_FILES.runtimePaletteLock.sha256,
      colorSetArtifact: FROZEN_GENERATOR_QUALITY_FILES.colorSetArtifact.sha256,
      colorSetLock: FROZEN_GENERATOR_QUALITY_FILES.colorSetLock.sha256,
    });
  });

  it("does not permit authoritative baseline creation from development synthetic corpus", () => {
    const manifest = parseGeneratorQualityManifest(
      JSON.parse(
        readFileSync(
          path.join(
            repositoryRoot,
            "data-source/quality/generator-corpus/0.1.0/manifest.json",
          ),
          "utf8",
        ),
      ),
    );
    expect(() =>
      assertAuthoritativeBaselineWriteAllowed(manifest, "synthetic", "1.0.0"),
    ).toThrow(/complete external corpus/);
  });

  it("contains no image network egress or production-module writes", () => {
    const source = qualityFiles()
      .filter((file) => file.endsWith(".ts") || file.endsWith(".mjs"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/,
    );
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/writeFile\([^)]*src\//);
  });

  it("uses the frozen E05 evaluator without modifying its byte identity", () => {
    const file = path.join(
      repositoryRoot,
      "src/features/bead-set-recommendation/bead-set-quality-evaluator.ts",
    );
    const sha256 = createHash("sha256")
      .update(readFileSync(file))
      .digest("hex");
    expect(sha256).toBe(
      "8faf6a22bd8fb2e6ef80528714e46423612d69ef11d185bedc67585388566647",
    );
    expect(
      readFileSync(
        path.join(
          repositoryRoot,
          "scripts/quality/generator/generator-quality-replay.ts",
        ),
        "utf8",
      ),
    ).toContain("evaluateBeadSetCandidateQuality");
  });
});

function qualityFiles(): string[] {
  const root = path.join(repositoryRoot, "scripts/quality/generator");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(root, entry.name));
}
