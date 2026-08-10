// @vitest-environment node

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { colorSetProductionGateConfig } from "./color-set-production-gate.config.ts";
import { compileColorSetLockFromFiles } from "./color-set-lock.ts";
import { verifyColorSetProductionGate } from "./verify-color-set-production-gate.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Color Set Lock and Production Gate", () => {
  it("regenerates the deterministic approved Lock", async () => {
    const first = await compileColorSetLockFromFiles(repositoryRoot);
    const second = await compileColorSetLockFromFiles(repositoryRoot);
    expect(second.bytes).toBe(first.bytes);
    expect(second.sha256).toBe(colorSetProductionGateConfig.lockSha256);
  });

  it("verifies the independent fail-closed production domain", async () => {
    await expect(
      verifyColorSetProductionGate(repositoryRoot),
    ).resolves.toMatchObject({
      verified: true,
      profileCounts: [24, 48, 72, 120, 168, 221],
    });
  });

  it("fails closed when the browser Artifact differs from its Lock", async () => {
    const fixture = await mkdtemp(
      path.join(os.tmpdir(), "poparooz-color-set-gate-"),
    );
    temporaryRoots.push(fixture);
    const relativePaths = [
      colorSetProductionGateConfig.lockPath,
      colorSetProductionGateConfig.artifactPath,
      "data-source/color-sets/Poparooz色卡-套装明细.xlsx",
      "data-source/palettes/poparooz-standard/1.0.0/normalized-palette.json",
      "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
    ];
    for (const relativePath of relativePaths) {
      const target = path.join(fixture, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await cp(path.join(repositoryRoot, relativePath), target);
    }
    const artifactPath = path.join(
      fixture,
      colorSetProductionGateConfig.artifactPath,
    );
    const bytes = await readFile(artifactPath);
    bytes[0] = bytes[0] === 0x7b ? 0x5b : 0x7b;
    await writeFile(artifactPath, bytes);
    await expect(verifyColorSetProductionGate(fixture)).rejects.toMatchObject({
      code: "COLOR_SET_PRODUCTION_GATE_FAILED",
    });
  });
});
