// @vitest-environment node

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createViteConfig } from "../../../vite.config.ts";
import { runtimePaletteProductionGateConfig } from "./runtime-palette-production-gate.config.ts";
import { verifyRuntimePaletteProductionGate } from "./verify-runtime-palette-production-gate.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const temporaryRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((temporaryRoot) =>
        rm(temporaryRoot, { recursive: true, force: true }),
      ),
  );
});

describe("Vite Runtime Palette Production Gate integration", () => {
  it.each(["production", "development", "custom"])(
    "awaits the Gate for command=build in %s mode",
    async (mode) => {
      const gate = vi.fn().mockResolvedValue({ verified: true });
      const colorSetGate = vi.fn().mockResolvedValue({ verified: true });
      await createViteConfig(
        { command: "build", mode, isSsrBuild: false, isPreview: false },
        gate,
        repositoryRoot,
        colorSetGate,
      );
      expect(gate).toHaveBeenCalledOnce();
      expect(gate).toHaveBeenCalledWith(repositoryRoot);
      expect(colorSetGate).toHaveBeenCalledOnce();
      expect(colorSetGate).toHaveBeenCalledWith(repositoryRoot);
    },
  );

  it("does not invoke the Production Build Gate for serve", async () => {
    const gate = vi.fn().mockResolvedValue({ verified: true });
    const colorSetGate = vi.fn().mockResolvedValue({ verified: true });
    await createViteConfig(
      {
        command: "serve",
        mode: "development",
        isSsrBuild: false,
        isPreview: false,
      },
      gate,
      repositoryRoot,
      colorSetGate,
    );
    expect(gate).not.toHaveBeenCalled();
    expect(colorSetGate).not.toHaveBeenCalled();
  });

  it("rejects configuration before returning build config", async () => {
    const failure = new Error("gate rejected");
    const gate = vi.fn().mockRejectedValue(failure);
    await expect(
      createViteConfig(
        {
          command: "build",
          mode: "development",
          isSsrBuild: false,
          isPreview: false,
        },
        gate,
        repositoryRoot,
      ),
    ).rejects.toBe(failure);
  });

  it("preserves an existing output sentinel when the Gate rejects", async () => {
    const outputDirectory = await mkdtemp(
      path.join(os.tmpdir(), "poparooz-gate-output-"),
    );
    temporaryRoots.push(outputDirectory);
    const sentinel = path.join(outputDirectory, "sentinel.txt");
    await writeFile(sentinel, "preserve me");
    const fixture = await createFixture();
    const lockPath = path.join(
      fixture,
      ...runtimePaletteProductionGateConfig.runtimeLockPath.split("/"),
    );
    const lockBytes = await readFile(lockPath);
    lockBytes[0] = lockBytes[0] === 0x7b ? 0x5b : 0x7b;
    await writeFile(lockPath, lockBytes);

    await expect(
      createViteConfig(
        {
          command: "build",
          mode: "production",
          isSsrBuild: false,
          isPreview: false,
        },
        verifyRuntimePaletteProductionGate,
        fixture,
      ),
    ).rejects.toMatchObject({
      code: "RUNTIME_PRODUCTION_LOCK_HASH_MISMATCH",
    });
    expect(await readFile(sentinel, "utf8")).toBe("preserve me");
  });
});

async function createFixture(): Promise<string> {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "poparooz-vite-gate-"));
  temporaryRoots.push(fixture);
  for (const relativePath of [
    "data-source/palettes/poparooz-standard/1.0.0",
    "data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0",
    "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0",
  ]) {
    await cp(
      path.join(repositoryRoot, relativePath),
      path.join(fixture, relativePath),
      { recursive: true },
    );
  }
  const policyRelativePath =
    "scripts/palette/runtime/policies/poparooz-standard.formal-1.0.0.runtime-1.0.0.json";
  const policyTarget = path.join(fixture, policyRelativePath);
  await mkdir(path.dirname(policyTarget), { recursive: true });
  await cp(path.join(repositoryRoot, policyRelativePath), policyTarget);
  return fixture;
}
