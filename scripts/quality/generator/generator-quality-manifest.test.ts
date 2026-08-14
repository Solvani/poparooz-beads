import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseGeneratorQualityManifest } from "./generator-quality-manifest.ts";
import { resolveExternalCorpus } from "./generator-quality-resolver.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("generator quality corpus governance", () => {
  it("parses a valid external declaration without local paths", () => {
    const manifest = parseGeneratorQualityManifest(
      manifestFor("inputs/case.png"),
    );

    expect(manifest.cases[0]?.input.logicalId).toBe("inputs/case.png");
    expect(JSON.stringify(manifest)).not.toContain(":\\");
  });

  it.each([
    [
      "missing hash",
      (value: ReturnType<typeof manifestFor>) => {
        Reflect.deleteProperty(value.cases[0]!.input, "sha256");
      },
    ],
    [
      "malformed category",
      (value: ReturnType<typeof manifestFor>) => {
        value.cases[0]!.primaryCategory = "unknown";
      },
    ],
    [
      "malformed tag",
      (value: ReturnType<typeof manifestFor>) => {
        value.cases[0]!.tags = ["unknown"];
      },
    ],
    [
      "path traversal",
      (value: ReturnType<typeof manifestFor>) => {
        value.cases[0]!.input.logicalId = "../escape.png";
      },
    ],
  ])("rejects %s", (_label, mutate) => {
    const value = manifestFor("inputs/case.png");
    mutate(value);
    expect(() => parseGeneratorQualityManifest(value)).toThrow();
  });

  it("rejects duplicate case and logical ids", () => {
    const value = manifestFor("inputs/case.png");
    value.cases.push(structuredClone(value.cases[0]!));
    expect(() => parseGeneratorQualityManifest(value)).toThrow(
      /Duplicate case id|Duplicate logical input id/,
    );
  });

  it("resolves the exact declared inventory and verifies bytes", async () => {
    const bytes = Buffer.from("approved local evidence");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const root = await createRoot();
    await mkdir(path.join(root, "inputs"));
    await writeFile(path.join(root, "inputs", "case.png"), bytes);
    const manifest = parseGeneratorQualityManifest(
      manifestFor("inputs/case.png", sha256),
    );

    const result = await resolveExternalCorpus(manifest, root);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ logicalId: "inputs/case.png", sha256 });
  });

  it("fails on missing, wrong-hash, and undeclared extra inputs", async () => {
    const bytes = Buffer.from("approved local evidence");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const manifest = parseGeneratorQualityManifest(
      manifestFor("inputs/case.png", sha256),
    );

    const missingRoot = await createRoot();
    await expect(
      resolveExternalCorpus(manifest, missingRoot),
    ).rejects.toThrow();

    const wrongRoot = await createRoot();
    await mkdir(path.join(wrongRoot, "inputs"));
    await writeFile(path.join(wrongRoot, "inputs", "case.png"), "wrong");
    await expect(resolveExternalCorpus(manifest, wrongRoot)).rejects.toThrow(
      /SHA-256/,
    );

    const extraRoot = await createRoot();
    await mkdir(path.join(extraRoot, "inputs"));
    await writeFile(path.join(extraRoot, "inputs", "case.png"), bytes);
    await writeFile(path.join(extraRoot, "inputs", "extra.png"), bytes);
    await expect(resolveExternalCorpus(manifest, extraRoot)).rejects.toThrow(
      /exactly match/,
    );
  });
});

async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "poparooz-quality-test-"));
  temporaryDirectories.push(root);
  return root;
}

function manifestFor(logicalId: string, sha256 = "a".repeat(64)) {
  return {
    schemaVersion: "1.0.0",
    corpusVersion: "0.1.0",
    corpusStatus: "development",
    cases: [
      {
        id: "external-case",
        primaryCategory: "simple-graphic",
        tags: ["external-curated"],
        sourceKind: "external-curated",
        input: {
          logicalId,
          sha256,
          alphaClassification: "unknown",
        },
        reference: { type: "none" },
        supportedBackgrounds: ["transparent"],
        supportedPatternSizes: [104],
        authorization: {
          storage: "external-local-only",
          status: "approved",
        },
      },
    ],
  };
}
