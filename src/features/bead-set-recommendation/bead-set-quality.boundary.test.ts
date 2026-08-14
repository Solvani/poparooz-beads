import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const PRODUCTION_FILES = [
  "bead-set-quality.types.ts",
  "bead-set-quality-evaluator.ts",
  "bead-set-quality-service.ts",
  "index.ts",
] as const;

function source(file: string): string {
  return readFileSync(
    resolve(process.cwd(), "src/features/bead-set-recommendation", file),
    "utf8",
  );
}

describe("E05 quality evaluator boundaries", () => {
  it("contains no copied membership table or unpublished profile", () => {
    const combined = PRODUCTION_FILES.map(source).join("\n");
    expect(combined).not.toMatch(/memberCodes\s*:/);
    expect(combined).not.toMatch(/poparooz-set-(96|144|192)/);
    expect(combined).not.toMatch(/[\"'`]A4[\"'`]|[\"'`]M15[\"'`]/);
  });

  it("does not depend on manual selection, Generation Service, or Worker protocol", () => {
    const combined = PRODUCTION_FILES.map(source).join("\n");
    expect(combined).not.toContain("selectedColorSetProfileId");
    expect(combined).not.toContain("generation-service");
    expect(combined).not.toContain("quantization-worker.protocol");
    expect(combined).not.toContain("GenerationService");
  });

  it("has no image network, persistence, analytics, or customer presentation path", () => {
    const combined = PRODUCTION_FILES.map(source).join("\n");
    for (const forbidden of [
      "fetch(",
      "XMLHttpRequest",
      "WebSocket",
      "sendBeacon",
      "localStorage",
      "indexedDB",
      "postMessage",
      "Recommended for Your Image",
      "Best Value",
    ]) {
      expect(combined).not.toContain(forbidden);
    }
  });
});
