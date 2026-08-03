import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { RuntimePaletteCompilation } from "./runtime-palette-compiler.ts";
import { RuntimePaletteCompilationError } from "./runtime-palette-errors.ts";
import {
  compileRuntimePaletteFromFiles,
  nodeRuntimePaletteFileSystem,
  publishRuntimePaletteArtifact,
  type RuntimePaletteFileSystem,
} from "./runtime-palette-io.ts";

const repositoryRoot = process.cwd();
const formalDirectory = path.join(
  repositoryRoot,
  "data-source/palettes/poparooz-standard/1.0.0",
);
const policyPath = path.join(
  repositoryRoot,
  "scripts/palette/runtime/policies/poparooz-standard.formal-1.0.0.runtime-1.0.0.json",
);

let compilation: RuntimePaletteCompilation;
const temporaryRoots: string[] = [];

beforeAll(async () => {
  compilation = await compileRuntimePaletteFromFiles(
    formalDirectory,
    policyPath,
  );
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Runtime Palette publication", () => {
  it("publishes only verified bytes and is idempotent", async () => {
    const outputPath = await temporaryOutput();
    expect(
      await publishRuntimePaletteArtifact(compilation, outputPath),
    ).toEqual({ published: true });
    expect(await readFile(outputPath, "utf8")).toBe(compilation.bytes);
    expect(
      await publishRuntimePaletteArtifact(compilation, outputPath),
    ).toEqual({ published: false });
    await expect(stat(`${outputPath}.compile-tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("never overwrites a different existing Artifact", async () => {
    const outputPath = await temporaryOutput();
    await nodeRuntimePaletteFileSystem.mkdir(path.dirname(outputPath), {
      recursive: true,
    });
    await nodeRuntimePaletteFileSystem.writeFile(outputPath, "existing\n", {
      encoding: "utf8",
      flag: "wx",
    });
    await expect(
      publishRuntimePaletteArtifact(compilation, outputPath),
    ).rejects.toMatchObject({ code: "PUBLICATION_CONFLICT" });
    expect(await readFile(outputPath, "utf8")).toBe("existing\n");
  });

  it("does not publish when staging write fails", async () => {
    const outputPath = await temporaryOutput();
    const fileSystem: RuntimePaletteFileSystem = {
      ...nodeRuntimePaletteFileSystem,
      async writeFile() {
        throw new Error("injected write failure");
      },
    };
    await expect(
      publishRuntimePaletteArtifact(compilation, outputPath, fileSystem),
    ).rejects.toMatchObject({ code: "PUBLICATION_FAILED" });
    await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not publish or retain staging when reread verification fails", async () => {
    const outputPath = await temporaryOutput();
    let staged = false;
    const fileSystem: RuntimePaletteFileSystem = {
      ...nodeRuntimePaletteFileSystem,
      async writeFile(filePath, contents, options) {
        await nodeRuntimePaletteFileSystem.writeFile(
          filePath,
          contents,
          options,
        );
        staged = true;
      },
      async readFile(filePath) {
        if (staged && filePath.endsWith(".compile-tmp")) {
          return Buffer.from("{}\n", "utf8");
        }
        return nodeRuntimePaletteFileSystem.readFile(filePath);
      },
    };
    await expect(
      publishRuntimePaletteArtifact(compilation, outputPath, fileSystem),
    ).rejects.toMatchObject({ code: "PUBLICATION_FAILED" });
    await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(`${outputPath}.compile-tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("does not publish or retain staging when the atomic rename fails", async () => {
    const outputPath = await temporaryOutput();
    const fileSystem: RuntimePaletteFileSystem = {
      ...nodeRuntimePaletteFileSystem,
      async rename() {
        throw new Error("injected rename failure");
      },
    };
    await expect(
      publishRuntimePaletteArtifact(compilation, outputPath, fileSystem),
    ).rejects.toMatchObject({ code: "PUBLICATION_FAILED" });
    await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(`${outputPath}.compile-tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("preserves typed compiler errors and excludes filesystem paths", async () => {
    const error = new RuntimePaletteCompilationError(
      "INPUT_READ_FAILED",
      "Could not read C:\\Users\\PaletteOwner\\secret.json",
    );
    expect(error.message).toBe("[INPUT_READ_FAILED] Could not read <path>");
  });
});

async function temporaryOutput(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "poparooz-runtime-"));
  temporaryRoots.push(root);
  return path.join(root, "nested", "runtime-palette.json");
}
