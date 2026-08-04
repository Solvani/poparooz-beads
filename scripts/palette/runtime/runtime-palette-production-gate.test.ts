// @vitest-environment node

import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { RuntimePaletteCompilationError } from "./runtime-palette-errors.ts";
import { runtimePaletteProductionGateConfig } from "./runtime-palette-production-gate.config.ts";
import { runRuntimePaletteProductionGateCli } from "./verify-runtime-palette-production-gate-cli.ts";
import {
  nodeRuntimePaletteProductionGateFileSystem,
  verifyRuntimePaletteProductionGate,
} from "./verify-runtime-palette-production-gate.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((temporaryRoot) =>
        rm(temporaryRoot, { recursive: true, force: true }),
      ),
  );
});

describe("Runtime Palette Production Gate", () => {
  it("verifies the approved repository without changing locked bytes", async () => {
    const before = await approvedBytes();

    const result = await verifyRuntimePaletteProductionGate(repositoryRoot);

    expect(result).toEqual({
      paletteId: "poparooz-standard",
      paletteVersion: "1.0.0",
      artifactVersion: "1.0.0",
      runtimeLockSha256:
        "36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648",
      runtimeArtifactSha256:
        "86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70",
      recordCount: 221,
      activeCount: 221,
      autoMatchEligibleCount: 221,
      verified: true,
    });
    expect(await approvedBytes()).toEqual(before);
  });

  it.each([
    ["Lock path", { runtimeLockPath: "wrong/runtime-palette.lock.json" }],
    ["Lock SHA", { runtimeLockSha256: "0".repeat(64) }],
    ["Artifact path", { runtimeArtifactPath: "wrong/runtime-palette.json" }],
    ["Artifact SHA", { runtimeArtifactSha256: "0".repeat(64) }],
    ["identity", { paletteId: "other" }],
    ["count", { recordCount: 220 }],
    ["absolute path", { runtimeLockPath: "C:/runtime-palette.lock.json" }],
    ["backslash path", { runtimeLockPath: "data-source\\runtime.lock.json" }],
    ["unknown field", { unexpected: true }],
  ])("rejects invalid approval config: %s", async (_label, mutation) => {
    const candidate = { ...cloneConfig(), ...mutation };
    await expectGateCode(
      verifyRuntimePaletteProductionGate(repositoryRoot, candidate),
      "RUNTIME_PRODUCTION_GATE_CONFIG_INVALID",
    );
  });

  it("rejects an incorrect approved Formal hash", async () => {
    const candidate = cloneConfig();
    const hashes = candidate.approvedFormalHashes as Record<string, unknown>;
    hashes.sourceSha256 = "0".repeat(64);
    await expectGateCode(
      verifyRuntimePaletteProductionGate(repositoryRoot, candidate),
      "RUNTIME_PRODUCTION_GATE_CONFIG_INVALID",
    );
  });

  it("fails closed when the Lock is missing", async () => {
    const fixture = await createFixture();
    await rm(
      resolveFixture(
        fixture,
        runtimePaletteProductionGateConfig.runtimeLockPath,
      ),
    );
    await expectGateCode(
      verifyRuntimePaletteProductionGate(fixture),
      "RUNTIME_PRODUCTION_LOCK_MISSING",
    );
  });

  it.each(["identity", "artifact hash", "Formal hash", "count"])(
    "rejects a changed but valid Lock (%s) before trusting its contents",
    async (kind) => {
      const fixture = await createFixture();
      const lockPath = resolveFixture(
        fixture,
        runtimePaletteProductionGateConfig.runtimeLockPath,
      );
      const lock = JSON.parse(await readFile(lockPath, "utf8"));
      if (kind === "identity") lock.paletteId = "other";
      if (kind === "artifact hash")
        lock.runtimeArtifact.sha256 = "0".repeat(64);
      if (kind === "Formal hash") {
        lock.approvedFormalHashes.sourceSha256 = "0".repeat(64);
      }
      if (kind === "count") lock.runtimeArtifact.recordCount = 220;
      await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
      await expectGateCode(
        verifyRuntimePaletteProductionGate(fixture),
        "RUNTIME_PRODUCTION_LOCK_HASH_MISMATCH",
      );
    },
  );

  it("rejects any arbitrary Lock byte change", async () => {
    const fixture = await createFixture();
    await appendByte(
      resolveFixture(
        fixture,
        runtimePaletteProductionGateConfig.runtimeLockPath,
      ),
    );
    await expectGateCode(
      verifyRuntimePaletteProductionGate(fixture),
      "RUNTIME_PRODUCTION_LOCK_HASH_MISMATCH",
    );
  });

  it.each([
    ["manifest", "manifest.json"],
    ["normalized Palette", "normalized-palette.json"],
    ["derivation audit", "color-derivation-audit.json"],
    ["validation report", "palette-validation-report.json"],
    ["Runtime policy", "poparooz-standard.formal-1.0.0.runtime-1.0.0.json"],
  ])("rejects a missing locked %s", async (_label, fileName) => {
    const fixture = await createFixture();
    const target = await findFixtureFile(fixture, fileName);
    await rm(target);
    await expectGateCode(
      verifyRuntimePaletteProductionGate(fixture),
      "RUNTIME_PRODUCTION_INPUT_MISSING",
    );
  });

  it.each([
    ["manifest", "manifest.json"],
    ["normalized Palette", "normalized-palette.json"],
    ["derivation audit", "color-derivation-audit.json"],
    ["validation report", "palette-validation-report.json"],
    ["Runtime policy", "poparooz-standard.formal-1.0.0.runtime-1.0.0.json"],
  ])("rejects changed locked %s bytes", async (_label, fileName) => {
    const fixture = await createFixture();
    const target = await findFixtureFile(fixture, fileName);
    const bytes = await readFile(target);
    bytes[0] = bytes[0] === 0x7b ? 0x5b : 0x7b;
    await writeFile(target, bytes);
    await expectGateCode(
      verifyRuntimePaletteProductionGate(fixture),
      "RUNTIME_PRODUCTION_INPUT_HASH_MISMATCH",
    );
  });

  it("distinguishes locked input length and hash mismatches", async () => {
    const lengthFixture = await createFixture();
    const lengthTarget = await findFixtureFile(lengthFixture, "manifest.json");
    await appendByte(lengthTarget);
    await expectGateCode(
      verifyRuntimePaletteProductionGate(lengthFixture),
      "RUNTIME_PRODUCTION_INPUT_LENGTH_MISMATCH",
    );

    const hashFixture = await createFixture();
    const hashTarget = await findFixtureFile(hashFixture, "manifest.json");
    const bytes = await readFile(hashTarget);
    bytes[0] = bytes[0] === 0x7b ? 0x5b : 0x7b;
    await writeFile(hashTarget, bytes);
    await expectGateCode(
      verifyRuntimePaletteProductionGate(hashFixture),
      "RUNTIME_PRODUCTION_INPUT_HASH_MISMATCH",
    );
  });

  it("rejects a locked input replaced by a directory", async () => {
    const fixture = await createFixture();
    const target = await findFixtureFile(fixture, "manifest.json");
    await rm(target);
    await mkdir(target);
    await expectGateCode(
      verifyRuntimePaletteProductionGate(fixture),
      "RUNTIME_PRODUCTION_PATH_INVALID",
    );
  });

  it("rejects a symbolic-link risk before reading approved bytes", async () => {
    const lockSuffix = runtimePaletteProductionGateConfig.runtimeLockPath
      .split("/")
      .join(path.sep);
    const fileSystem = {
      ...nodeRuntimePaletteProductionGateFileSystem,
      async lstat(filePath: string) {
        if (filePath.endsWith(lockSuffix)) {
          return {
            isDirectory: () => false,
            isFile: () => true,
            isSymbolicLink: () => true,
          };
        }
        return nodeRuntimePaletteProductionGateFileSystem.lstat(filePath);
      },
    };
    await expectGateCode(
      verifyRuntimePaletteProductionGate(
        repositoryRoot,
        runtimePaletteProductionGateConfig,
        fileSystem,
      ),
      "RUNTIME_PRODUCTION_PATH_INVALID",
    );
  });

  it("rejects missing or changed Runtime Artifact bytes", async () => {
    const missingFixture = await createFixture();
    await rm(
      resolveFixture(
        missingFixture,
        runtimePaletteProductionGateConfig.runtimeArtifactPath,
      ),
    );
    await expectGateCode(
      verifyRuntimePaletteProductionGate(missingFixture),
      "RUNTIME_PRODUCTION_ARTIFACT_MISSING",
    );

    const changedFixture = await createFixture();
    await appendByte(
      resolveFixture(
        changedFixture,
        runtimePaletteProductionGateConfig.runtimeArtifactPath,
      ),
    );
    await expectGateCode(
      verifyRuntimePaletteProductionGate(changedFixture),
      "RUNTIME_PRODUCTION_ARTIFACT_HASH_MISMATCH",
    );
  });

  it.each([
    "schema-valid color content",
    "identity",
    "count",
    "duplicate code",
    "noncontiguous sort order",
    "ineligible active invariant",
  ])("rejects a committed Artifact semantic change: %s", async (kind) => {
    const fixture = await createFixture();
    const artifactPath = resolveFixture(
      fixture,
      runtimePaletteProductionGateConfig.runtimeArtifactPath,
    );
    const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
    if (kind === "schema-valid color content")
      artifact.colors[0].hex = "#000001";
    if (kind === "identity") artifact.paletteId = "other";
    if (kind === "count") artifact.recordCount = 220;
    if (kind === "duplicate code")
      artifact.colors[1].code = artifact.colors[0].code;
    if (kind === "noncontiguous sort order") artifact.colors[1].sortOrder = 0;
    if (kind === "ineligible active invariant") {
      artifact.colors[0].active = false;
      artifact.colors[0].autoMatchEligible = true;
    }
    await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    await expectGateCode(
      verifyRuntimePaletteProductionGate(fixture),
      "RUNTIME_PRODUCTION_ARTIFACT_HASH_MISMATCH",
    );
  });

  it.each([
    [
      "artifact",
      runtimePaletteProductionGateConfig.runtimeArtifactPath,
      "extra.json",
    ],
    [
      "lock",
      runtimePaletteProductionGateConfig.runtimeLockPath,
      "runtime.lock.tmp",
    ],
  ])(
    "rejects extra %s directory files",
    async (_label, approvedPath, extraName) => {
      const fixture = await createFixture();
      await writeFile(
        path.join(
          path.dirname(resolveFixture(fixture, approvedPath)),
          extraName,
        ),
        "unexpected",
      );
      await expectGateCode(
        verifyRuntimePaletteProductionGate(fixture),
        "RUNTIME_PRODUCTION_INVENTORY_INVALID",
      );
    },
  );

  it.each([
    ["artifact", runtimePaletteProductionGateConfig.runtimeArtifactPath],
    ["lock", runtimePaletteProductionGateConfig.runtimeLockPath],
  ])(
    "rejects extra %s directory subdirectories",
    async (_label, approvedPath) => {
      const fixture = await createFixture();
      await mkdir(
        path.join(path.dirname(resolveFixture(fixture, approvedPath)), "old"),
      );
      await expectGateCode(
        verifyRuntimePaletteProductionGate(fixture),
        "RUNTIME_PRODUCTION_INVENTORY_INVALID",
      );
    },
  );

  it("resolves every core path from an explicit repository root, not cwd", async () => {
    const originalCwd = process.cwd();
    const otherCwd = await mkdtemp(
      path.join(os.tmpdir(), "poparooz-gate-cwd-"),
    );
    temporaryRoots.push(otherCwd);
    try {
      process.chdir(otherCwd);
      await expect(
        verifyRuntimePaletteProductionGate(repositoryRoot),
      ).resolves.toMatchObject({ verified: true });
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("returns a nonzero CLI result with a stable Gate error code", async () => {
    const messages: string[] = [];
    const exitCode = await runRuntimePaletteProductionGateCli(
      repositoryRoot,
      {
        log: (message) => messages.push(message),
        error: (message) => messages.push(message),
      },
      async () => {
        throw new RuntimePaletteCompilationError(
          "RUNTIME_PRODUCTION_LOCK_HASH_MISMATCH",
          "The approved Lock differs.",
        );
      },
    );
    expect(exitCode).toBe(1);
    expect(messages).toEqual([
      "[RUNTIME_PRODUCTION_LOCK_HASH_MISMATCH] The approved Lock differs.",
    ]);
  });
});

function cloneConfig(): Record<string, unknown> {
  return structuredClone(runtimePaletteProductionGateConfig);
}

async function createFixture(): Promise<string> {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "poparooz-gate-"));
  temporaryRoots.push(fixture);
  for (const relativePath of [
    "data-source/palettes/poparooz-standard/1.0.0",
    "data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0",
    "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0",
  ]) {
    await cp(
      path.join(repositoryRoot, relativePath),
      path.join(fixture, relativePath),
      {
        recursive: true,
      },
    );
  }
  const policyRelativePath =
    "scripts/palette/runtime/policies/poparooz-standard.formal-1.0.0.runtime-1.0.0.json";
  const policyTarget = path.join(fixture, policyRelativePath);
  await mkdir(path.dirname(policyTarget), { recursive: true });
  await cp(path.join(repositoryRoot, policyRelativePath), policyTarget);
  return fixture;
}

async function approvedBytes() {
  return Promise.all(
    [
      runtimePaletteProductionGateConfig.runtimeLockPath,
      runtimePaletteProductionGateConfig.runtimeArtifactPath,
    ].map((relativePath) => readFile(path.join(repositoryRoot, relativePath))),
  );
}

function resolveFixture(fixture: string, relativePath: string): string {
  return path.join(fixture, ...relativePath.split("/"));
}

async function appendByte(filePath: string): Promise<void> {
  const bytes = await readFile(filePath);
  await writeFile(filePath, Buffer.concat([bytes, Buffer.from(" ")]));
}

async function findFixtureFile(
  fixture: string,
  fileName: string,
): Promise<string> {
  const queue = [fixture];
  while (queue.length > 0) {
    const directory = queue.shift()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) queue.push(entryPath);
      if (entry.isFile() && entry.name === fileName) return entryPath;
    }
  }
  throw new Error(`Fixture file not found: ${fileName}`);
}

async function expectGateCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}
