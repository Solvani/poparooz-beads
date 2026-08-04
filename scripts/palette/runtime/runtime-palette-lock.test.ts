import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { RuntimePaletteCompilationError } from "./runtime-palette-errors.ts";
import {
  nodeRuntimePaletteFileSystem,
  type RuntimePaletteFileSystem,
} from "./runtime-palette-io.ts";
import {
  compileRuntimePaletteLock,
  compileRuntimePaletteLockFromFiles,
  parseRuntimeLock,
  publishRuntimePaletteLock,
  RUNTIME_PALETTE_LOCK_INPUT_PATHS,
  RUNTIME_PALETTE_LOCK_RELATIVE_PATH,
  type RuntimePaletteLockCompilation,
  type RuntimePaletteLockInputBytes,
} from "./runtime-palette-lock.ts";

const repositoryRoot = process.cwd();
const committedLockPath = path.join(
  repositoryRoot,
  RUNTIME_PALETTE_LOCK_RELATIVE_PATH,
);
const temporaryRoots: string[] = [];
let approvedInputs: RuntimePaletteLockInputBytes;
let approvedCompilation: RuntimePaletteLockCompilation;

beforeAll(async () => {
  approvedInputs = await loadApprovedInputs();
  approvedCompilation = compileRuntimePaletteLock(approvedInputs);
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Node-only Runtime Palette Lock", () => {
  it("locks the exact identity, Formal hashes, inputs, Artifact, and counts", () => {
    const { lock } = approvedCompilation;
    expect(lock).toMatchObject({
      schemaVersion: "1.0.0",
      lockVersion: "1.0.0",
      paletteId: "poparooz-standard",
      paletteVersion: "1.0.0",
      artifactVersion: "1.0.0",
      referenceSystem: "POPAROOZ",
      approvedFormalHashes: {
        sourceSha256:
          "5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e",
        paletteCanonicalSha256:
          "1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4",
        derivationAuditSha256:
          "f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020",
      },
      runtimeArtifact: {
        sha256:
          "86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70",
        recordCount: 221,
        activeCount: 221,
        autoMatchEligibleCount: 221,
      },
    });
    expect(Object.keys(lock.inputs)).toEqual([
      "manifest",
      "normalizedPalette",
      "colorDerivationAudit",
      "paletteValidationReport",
      "runtimePolicy",
    ]);
  });

  it("records actual SHA-256 and byteLength for every locked file", () => {
    const bindings = [
      [approvedCompilation.lock.inputs.manifest, approvedInputs.manifest],
      [
        approvedCompilation.lock.inputs.normalizedPalette,
        approvedInputs.normalizedPalette,
      ],
      [
        approvedCompilation.lock.inputs.colorDerivationAudit,
        approvedInputs.derivationAudit,
      ],
      [
        approvedCompilation.lock.inputs.paletteValidationReport,
        approvedInputs.validationReport,
      ],
      [approvedCompilation.lock.inputs.runtimePolicy, approvedInputs.policy],
      [
        approvedCompilation.lock.runtimeArtifact,
        approvedInputs.runtimeArtifact,
      ],
    ] as const;
    for (const [locked, actual] of bindings) {
      expect(locked.sha256).toBe(hash(actual));
      expect(locked.byteLength).toBe(actual.byteLength);
      expect(locked.path).not.toMatch(/^[A-Za-z]:|^\/|\\/);
    }
  });

  it("uses only the strict recursive Lock whitelist", () => {
    const lock = approvedCompilation.lock;
    expect(Object.keys(lock)).toEqual([
      "schemaVersion",
      "lockVersion",
      "paletteId",
      "paletteVersion",
      "artifactVersion",
      "referenceSystem",
      "approvedFormalHashes",
      "inputs",
      "runtimeArtifact",
    ]);
    expect(Object.keys(lock.approvedFormalHashes)).toEqual([
      "sourceSha256",
      "paletteCanonicalSha256",
      "derivationAuditSha256",
    ]);
    for (const locked of [
      ...Object.values(lock.inputs),
      lock.runtimeArtifact,
    ]) {
      expect(Object.keys(locked).slice(0, 3)).toEqual([
        "path",
        "sha256",
        "byteLength",
      ]);
    }
    expect(() =>
      parseRuntimeLock(
        `${JSON.stringify({ ...lock, generatedAt: "never" }, null, 2)}\n`,
      ),
    ).toThrowError(RuntimePaletteCompilationError);

    const nestedUnknown = structuredClone(lock) as unknown as Record<
      string,
      unknown
    >;
    const inputs = nestedUnknown.inputs as Record<
      string,
      Record<string, unknown>
    >;
    const manifest = inputs.manifest;
    if (manifest === undefined)
      throw new Error("Missing Lock manifest fixture.");
    manifest.extra = true;
    expect(() =>
      parseRuntimeLock(`${JSON.stringify(nestedUnknown, null, 2)}\n`),
    ).toThrowError(RuntimePaletteCompilationError);
  });

  it("rejects absolute and non-POSIX locked paths", () => {
    for (const invalidPath of [
      "D:/Projects/palette.json",
      "/data-source/palette.json",
      "data-source\\palette.json",
      "../palette.json",
    ]) {
      const lock = structuredClone(
        approvedCompilation.lock,
      ) as unknown as Record<string, unknown>;
      const inputs = lock.inputs as Record<string, Record<string, unknown>>;
      const manifest = inputs.manifest;
      if (manifest === undefined)
        throw new Error("Missing Lock manifest fixture.");
      manifest.path = invalidPath;
      expect(() =>
        parseRuntimeLock(`${JSON.stringify(lock, null, 2)}\n`),
      ).toThrowError(RuntimePaletteCompilationError);
    }
  });

  it("is deterministic and matches the generated Lock byte-for-byte", async () => {
    const first = compileRuntimePaletteLock(approvedInputs);
    const second = compileRuntimePaletteLock(cloneInputs());
    expect(second.bytes).toBe(first.bytes);
    expect(second.sha256).toBe(first.sha256);
    expect(await readFile(committedLockPath, "utf8")).toBe(first.bytes);
    expect(first.bytes).not.toContain("\r");
    expect(first.bytes.endsWith("\n")).toBe(true);
    expect(first.bytes.endsWith("\n\n")).toBe(false);
  });

  it("contains no forbidden environment, Substitute, supplier, or catalog fields", () => {
    for (const forbidden of [
      "generatedAt",
      "generatedBy",
      "gitHead",
      "branch",
      "origin",
      "hostname",
      "platform",
      "username",
      "workingDirectory",
      "compilerPath",
      "substituteCanonicalSha256",
      "substitutes",
      "MARD",
      "supplier",
      "inventory",
      "Shopify",
    ]) {
      expect(approvedCompilation.bytes).not.toContain(forbidden);
    }
  });

  it.each([
    "manifest",
    "normalizedPalette",
    "derivationAudit",
    "validationReport",
    "policy",
  ] as const)(
    "fails closed when %s bytes change but JSON remains valid",
    (name) => {
      const inputs = cloneInputs();
      inputs[name] = Buffer.concat([inputs[name], Buffer.from(" ")]);
      expectLockError(inputs, "RUNTIME_LOCK_INPUT_INVALID");
    },
  );

  it("rejects an identity change", () => {
    const inputs = cloneInputs();
    inputs.policy = mutateJson(inputs.policy, (value) => {
      value.paletteVersion = "2.0.0";
    });
    expectLockError(inputs, "RUNTIME_LOCK_INPUT_INVALID");
  });

  it.each([
    ["sourceFileSha256", "0".repeat(64)],
    ["canonicalRecordsSha256", "1".repeat(64)],
  ] as const)("rejects changed Manifest approved hash %s", (key, value) => {
    const inputs = cloneInputs();
    inputs.manifest = mutateJson(inputs.manifest, (manifest) => {
      manifest[key] = value;
    });
    expectLockError(inputs, "RUNTIME_LOCK_INPUT_INVALID");
  });

  it("rejects a changed derivation approved hash", () => {
    const inputs = cloneInputs();
    inputs.validationReport = mutateJson(inputs.validationReport, (report) => {
      report.derivationAuditSha256 = "2".repeat(64);
    });
    expectLockError(inputs, "RUNTIME_LOCK_INPUT_INVALID");
  });

  it("rejects a non-approved Manifest and non-passing report", () => {
    const manifestInputs = cloneInputs();
    manifestInputs.manifest = mutateJson(
      manifestInputs.manifest,
      (manifest) => {
        manifest.status = "draft";
        delete manifest.approvedAt;
        delete manifest.approvedBy;
      },
    );
    expectLockError(manifestInputs, "RUNTIME_LOCK_INPUT_INVALID");

    const reportInputs = cloneInputs();
    reportInputs.validationReport = mutateJson(
      reportInputs.validationReport,
      (report) => {
        report.result = "failed";
      },
    );
    expectLockError(reportInputs, "RUNTIME_LOCK_INPUT_INVALID");
  });

  it("rejects arbitrary and schema-valid Artifact byte changes", () => {
    const arbitrary = cloneInputs();
    arbitrary.runtimeArtifact = Buffer.from("{}\n");
    expectLockError(arbitrary, "RUNTIME_LOCK_INPUT_INVALID");

    const schemaValid = cloneInputs();
    schemaValid.runtimeArtifact = mutateJson(
      schemaValid.runtimeArtifact,
      (artifact) => {
        const colors = artifact.colors as Array<Record<string, unknown>>;
        const first = colors[0];
        if (first === undefined)
          throw new Error("Missing Artifact fixture color.");
        first.hex = "#000000";
      },
    );
    expectLockError(schemaValid, "RUNTIME_LOCK_INPUT_INVALID");
  });

  it("loads and recompiles only the approved repository inputs", async () => {
    expect(
      (await compileRuntimePaletteLockFromFiles(repositoryRoot)).bytes,
    ).toBe(approvedCompilation.bytes);
  });
});

describe("Runtime Palette Lock publication", () => {
  it("publishes once and returns published false for identical bytes", async () => {
    const outputPath = await temporaryOutput();
    expect(
      await publishRuntimePaletteLock(approvedCompilation, outputPath),
    ).toEqual({ published: true });
    expect(await readFile(outputPath, "utf8")).toBe(approvedCompilation.bytes);
    expect(
      await publishRuntimePaletteLock(approvedCompilation, outputPath),
    ).toEqual({ published: false });
    await expect(stat(`${outputPath}.compile-tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects a different existing Lock without overwriting it", async () => {
    const outputPath = await temporaryOutput();
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, "{}\n", "utf8");
    await expect(
      publishRuntimePaletteLock(approvedCompilation, outputPath),
    ).rejects.toMatchObject({ code: "PUBLICATION_CONFLICT" });
    expect(await readFile(outputPath, "utf8")).toBe("{}\n");
  });

  it("rejects extra files in the Lock directory", async () => {
    const outputPath = await temporaryOutput();
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(path.join(path.dirname(outputPath), "extra.json"), "{}\n");
    await expect(
      publishRuntimePaletteLock(approvedCompilation, outputPath),
    ).rejects.toMatchObject({ code: "RUNTIME_LOCK_INVALID" });
    await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["write", "staging-reread", "rename", "published-reread"] as const)(
    "leaves no Lock or staging file when %s fails",
    async (failure) => {
      const outputPath = await temporaryOutput();
      let renamed = false;
      const fileSystem: RuntimePaletteFileSystem = {
        ...nodeRuntimePaletteFileSystem,
        async writeFile(filePath, contents, options) {
          if (failure === "write") throw new Error("injected write failure");
          return nodeRuntimePaletteFileSystem.writeFile(
            filePath,
            contents,
            options,
          );
        },
        async rename(sourcePath, destinationPath) {
          if (failure === "rename") throw new Error("injected rename failure");
          await nodeRuntimePaletteFileSystem.rename(
            sourcePath,
            destinationPath,
          );
          renamed = true;
        },
        async readFile(filePath) {
          if (
            failure === "staging-reread" &&
            filePath.endsWith(".compile-tmp")
          ) {
            return Buffer.from("{}\n");
          }
          if (
            failure === "published-reread" &&
            renamed &&
            filePath === outputPath
          ) {
            return Buffer.from("{}\n");
          }
          return nodeRuntimePaletteFileSystem.readFile(filePath);
        },
      };
      await expect(
        publishRuntimePaletteLock(approvedCompilation, outputPath, fileSystem),
      ).rejects.toMatchObject({ code: "PUBLICATION_FAILED" });
      await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(stat(`${outputPath}.compile-tmp`)).rejects.toMatchObject({
        code: "ENOENT",
      });
    },
  );
});

async function loadApprovedInputs(): Promise<RuntimePaletteLockInputBytes> {
  return {
    manifest: await readRepositoryFile(
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.manifest,
    ),
    normalizedPalette: await readRepositoryFile(
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.normalizedPalette,
    ),
    derivationAudit: await readRepositoryFile(
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.colorDerivationAudit,
    ),
    validationReport: await readRepositoryFile(
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.paletteValidationReport,
    ),
    policy: await readRepositoryFile(
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.runtimePolicy,
    ),
    runtimeArtifact: await readRepositoryFile(
      RUNTIME_PALETTE_LOCK_INPUT_PATHS.runtimeArtifact,
    ),
  };
}

type MutableLockInputs = {
  -readonly [Key in keyof RuntimePaletteLockInputBytes]: Buffer;
};

function cloneInputs(): MutableLockInputs {
  return {
    manifest: Buffer.from(approvedInputs.manifest),
    normalizedPalette: Buffer.from(approvedInputs.normalizedPalette),
    derivationAudit: Buffer.from(approvedInputs.derivationAudit),
    validationReport: Buffer.from(approvedInputs.validationReport),
    policy: Buffer.from(approvedInputs.policy),
    runtimeArtifact: Buffer.from(approvedInputs.runtimeArtifact),
  };
}

function expectLockError(
  inputs: RuntimePaletteLockInputBytes,
  code: string,
): void {
  try {
    compileRuntimePaletteLock(inputs);
    throw new Error("Expected Runtime Palette Lock compilation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(RuntimePaletteCompilationError);
    expect((error as RuntimePaletteCompilationError).code).toBe(code);
  }
}

function mutateJson(
  bytes: Buffer,
  mutate: (value: Record<string, unknown>) => void,
): Buffer {
  const value = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
  mutate(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readRepositoryFile(relativePath: string): Promise<Buffer> {
  return readFile(path.join(repositoryRoot, relativePath));
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function temporaryOutput(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "poparooz-lock-"));
  temporaryRoots.push(root);
  return path.join(root, "runtime-1.0.0", "runtime-palette.lock.json");
}
