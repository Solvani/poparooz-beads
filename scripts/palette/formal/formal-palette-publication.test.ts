import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { hashSourceFileBytes } from "./formal-palette-canonical.ts";
import { FormalPaletteCompilationError } from "./formal-palette-errors.ts";
import {
  FORMAL_PALETTE_PACKAGE_INVENTORY,
  nodeFormalPaletteFileSystem,
  publishFormalPaletteCompilation,
  verifyFormalPalettePackage,
  type FormalPaletteFileSystem,
} from "./formal-palette-publication.ts";
import {
  FORMAL_PALETTE_SOURCE_FILE_NAME,
  FORMAL_PALETTE_SOURCE_SHA256,
} from "./formal-palette-xlsx-compiler.ts";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const approvedPackage = path.join(
  repositoryRoot,
  "data-source",
  "palettes",
  "poparooz-standard",
  "1.0.0",
);
const approvedSource = path.join(
  approvedPackage,
  "source",
  FORMAL_PALETTE_SOURCE_FILE_NAME,
);

let sourceBytes: Buffer;
const temporaryRoots: string[] = [];

beforeAll(async () => {
  sourceBytes = await readFile(approvedSource);
  expect(hashSourceFileBytes(sourceBytes)).toBe(FORMAL_PALETTE_SOURCE_SHA256);
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("formal Palette retained-input publication", () => {
  it("publishes copy-first and retains the exact incoming bytes without incoming mutation calls", async () => {
    const fixture = await createIncomingFixture();
    const before = await readFile(fixture.incoming);
    let incomingRenameCalls = 0;
    let linkCalls = 0;
    let unlinkCalls = 0;
    const fileSystem = {
      ...nodeFormalPaletteFileSystem,
      async rename(sourcePath: string, destinationPath: string) {
        if (sourcePath === fixture.incoming) incomingRenameCalls += 1;
        await nodeFormalPaletteFileSystem.rename(sourcePath, destinationPath);
      },
      async link() {
        linkCalls += 1;
      },
      async unlink() {
        unlinkCalls += 1;
      },
    };

    const result = await publishFormalPaletteCompilation(
      fixture.incoming,
      fixture.output,
      fileSystem,
    );

    expect(result.incomingRetained).toBe(true);
    expect(result.incomingMatchesFormalSource).toBe(true);
    expect(await readFile(fixture.incoming)).toEqual(before);
    expect(incomingRenameCalls).toBe(0);
    expect(linkCalls).toBe(0);
    expect(unlinkCalls).toBe(0);
    await expect(
      verifyFormalPalettePackage(fixture.output),
    ).resolves.toBeDefined();
  });

  it("keeps incoming when a staged artifact write fails", async () => {
    const fixture = await createIncomingFixture();
    const injected = inject({
      async writeFile(filePath, contents) {
        if (filePath.endsWith("manifest.json")) throw new Error("injected");
        await nodeFormalPaletteFileSystem.writeFile(filePath, contents);
      },
    });

    await expect(
      publishFormalPaletteCompilation(
        fixture.incoming,
        fixture.output,
        injected,
      ),
    ).rejects.toMatchObject({ code: "STAGING_WRITE_FAILED" });
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
  });

  it("preserves the original failure when staging cleanup also fails", async () => {
    const fixture = await createIncomingFixture();
    const injected = inject({
      async writeFile() {
        throw new Error("injected write");
      },
      async rm() {
        throw new Error("injected cleanup");
      },
    });

    const error = await captureError(() =>
      publishFormalPaletteCompilation(
        fixture.incoming,
        fixture.output,
        injected,
      ),
    );
    expect(error.code).toBe("STAGING_STATE_INVALID");
    const causes = aggregateCauses(error);
    expect(causes[0]).toMatchObject({ code: "STAGING_WRITE_FAILED" });
    expect(causes[1]).toBeInstanceOf(Error);
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
  });

  it("preserves the primary write failure when the catch state probe fails", async () => {
    const fixture = await createIncomingFixture();
    let primaryFailed = false;
    const injected = inject({
      async writeFile() {
        primaryFailed = true;
        throw new Error("injected write");
      },
      async stat(filePath) {
        if (primaryFailed && filePath.endsWith(".compile-tmp")) {
          throw new Error(`state probe failed at ${fixture.root}`);
        }
        return nodeFormalPaletteFileSystem.stat(filePath);
      },
    });

    const error = await captureError(() =>
      publishFormalPaletteCompilation(
        fixture.incoming,
        fixture.output,
        injected,
      ),
    );
    const causes = aggregateCauses(error);
    expect(causes[0]).toMatchObject({ code: "STAGING_WRITE_FAILED" });
    expect(causes[1]).toMatchObject({ code: "STAGING_STATE_INVALID" });
    expect(error.message).not.toContain(fixture.root);
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
  });

  it("preserves primary, state-probe, and staging cleanup failures together", async () => {
    const fixture = await createIncomingFixture();
    let primaryFailed = false;
    const injected = inject({
      async writeFile() {
        primaryFailed = true;
        throw new Error("injected write");
      },
      async stat(filePath) {
        if (primaryFailed && filePath.endsWith(".compile-tmp")) {
          throw new Error("injected probe");
        }
        return nodeFormalPaletteFileSystem.stat(filePath);
      },
      async rm() {
        throw new Error("injected cleanup");
      },
    });

    const error = await captureError(() =>
      publishFormalPaletteCompilation(
        fixture.incoming,
        fixture.output,
        injected,
      ),
    );
    const causes = aggregateCauses(error);
    expect(causes).toHaveLength(3);
    expect(causes[0]).toMatchObject({ code: "STAGING_WRITE_FAILED" });
    expect(causes[1]).toMatchObject({ code: "STAGING_STATE_INVALID" });
    expect(causes[2]).toBeInstanceOf(Error);
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
  });

  it("keeps incoming when the staged source copy fails", async () => {
    const fixture = await createIncomingFixture();
    const injected = inject({
      async copyFile() {
        throw new Error("injected");
      },
    });
    await expect(
      publishFormalPaletteCompilation(
        fixture.incoming,
        fixture.output,
        injected,
      ),
    ).rejects.toMatchObject({ code: "STAGING_WRITE_FAILED" });
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
  });

  it("keeps incoming when staging verification fails", async () => {
    const fixture = await createIncomingFixture();
    const injected = inject({
      async readdir(directoryPath, options) {
        if (directoryPath.endsWith(".compile-tmp")) throw new Error("injected");
        return nodeFormalPaletteFileSystem.readdir(directoryPath, options);
      },
    });
    await expect(
      publishFormalPaletteCompilation(
        fixture.incoming,
        fixture.output,
        injected,
      ),
    ).rejects.toMatchObject({ code: "STAGING_VERIFICATION_FAILED" });
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
  });

  it("keeps incoming when final rename fails", async () => {
    const fixture = await createIncomingFixture();
    const injected = inject({
      async rename() {
        throw new Error("injected");
      },
    });
    await expect(
      publishFormalPaletteCompilation(
        fixture.incoming,
        fixture.output,
        injected,
      ),
    ).rejects.toMatchObject({ code: "PUBLICATION_FAILED" });
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
  });

  it("keeps incoming and the formal package when final verification fails", async () => {
    const fixture = await createIncomingFixture();
    let renamed = false;
    const injected = inject({
      async rename(sourcePath, destinationPath) {
        await nodeFormalPaletteFileSystem.rename(sourcePath, destinationPath);
        renamed = true;
      },
      async readFile(filePath) {
        if (
          renamed &&
          filePath === path.join(fixture.output, "manifest.json")
        ) {
          throw new Error("injected");
        }
        return nodeFormalPaletteFileSystem.readFile(filePath);
      },
    });
    await expect(
      publishFormalPaletteCompilation(
        fixture.incoming,
        fixture.output,
        injected,
      ),
    ).rejects.toMatchObject({ code: "PUBLICATION_FAILED" });
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
    await expect(
      readFile(path.join(fixture.output, "manifest.json")),
    ).resolves.toBeDefined();
  });

  it("returns SOURCE_NOT_FOUND when no publication source exists", async () => {
    const fixture = await createIncomingFixture();
    await unlink(fixture.incoming);
    await expect(
      publishFormalPaletteCompilation(fixture.incoming, fixture.output),
    ).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND" });
  });

  it("verifies a formal-only package without requiring incoming", async () => {
    const fixture = await createFormalFixture(false);
    const result = await publishFormalPaletteCompilation(
      fixture.incoming,
      fixture.output,
    );
    expect(result.incomingRetained).toBe(false);
    expect(result.incomingMatchesFormalSource).toBeUndefined();
  });

  it("verifies matching incoming and retains it unchanged", async () => {
    const fixture = await createFormalFixture(true);
    const before = await readFile(fixture.incoming);
    const result = await publishFormalPaletteCompilation(
      fixture.incoming,
      fixture.output,
    );
    expect(result.incomingRetained).toBe(true);
    expect(result.incomingMatchesFormalSource).toBe(true);
    expect(await readFile(fixture.incoming)).toEqual(before);
  });

  it("fails closed on conflicting incoming without changing formal or incoming", async () => {
    const fixture = await createFormalFixture(true);
    const changed = changedSourceBytes();
    await writeFile(fixture.incoming, changed);
    const formalBefore = await snapshotFormalPackage(fixture.output);

    const error = await captureError(() =>
      publishFormalPaletteCompilation(fixture.incoming, fixture.output),
    );

    expect(error.code).toBe("SOURCE_INPUT_CONFLICT");
    expect(error.message).not.toContain(fixture.root);
    expect(await readFile(fixture.incoming)).toEqual(changed);
    expect(await snapshotFormalPackage(fixture.output)).toEqual(formalBefore);
  });

  it("verifies formal before removing stale staging and does not touch incoming", async () => {
    const fixture = await createFormalFixture(true);
    const staging = `${fixture.output}.compile-tmp`;
    await mkdir(staging, { recursive: true });
    await writeFile(path.join(staging, "stale.txt"), "stale");
    const incomingBefore = await readFile(fixture.incoming);

    const result = await publishFormalPaletteCompilation(
      fixture.incoming,
      fixture.output,
    );
    expect(result.incomingRetained).toBe(true);
    expect(await readFile(fixture.incoming)).toEqual(incomingBefore);
    await expect(
      readFile(path.join(staging, "stale.txt")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("retains stale staging when formal verification fails", async () => {
    const fixture = await createFormalFixture(false);
    const staging = `${fixture.output}.compile-tmp`;
    await mkdir(staging, { recursive: true });
    await writeFile(path.join(staging, "stale.txt"), "stale");
    await writeFile(path.join(fixture.output, "extra.txt"), "extra");

    await expect(
      publishFormalPaletteCompilation(fixture.incoming, fixture.output),
    ).rejects.toMatchObject({ code: "FORMAL_PACKAGE_INVENTORY_MISMATCH" });
    await expect(
      readFile(path.join(staging, "stale.txt")),
    ).resolves.toBeDefined();
  });

  it("rebuilds stale staging and retains incoming after first publication", async () => {
    const fixture = await createIncomingFixture();
    const staging = `${fixture.output}.compile-tmp`;
    await mkdir(staging, { recursive: true });
    await writeFile(path.join(staging, "stale.txt"), "stale");

    const result = await publishFormalPaletteCompilation(
      fixture.incoming,
      fixture.output,
    );
    expect(result.incomingRetained).toBe(true);
    expect(await readFile(fixture.incoming)).toEqual(sourceBytes);
    await expect(
      verifyFormalPalettePackage(fixture.output),
    ).resolves.toBeDefined();
  });

  it("requires explicit recovery when only staging holds the source", async () => {
    const fixture = await createIncomingFixture();
    const stagingSource = path.join(
      `${fixture.output}.compile-tmp`,
      "source",
      FORMAL_PALETTE_SOURCE_FILE_NAME,
    );
    await mkdir(path.dirname(stagingSource), { recursive: true });
    await writeFile(stagingSource, sourceBytes);
    await unlink(fixture.incoming);

    await expect(
      publishFormalPaletteCompilation(fixture.incoming, fixture.output),
    ).rejects.toMatchObject({ code: "PUBLICATION_RECOVERY_REQUIRED" });
    expect(await readFile(stagingSource)).toEqual(sourceBytes);
  });
});

describe("formal Palette exact package inventory", () => {
  it("rejects an extra file", async () => {
    const fixture = await createFormalFixture(false);
    await writeFile(path.join(fixture.output, "extra.txt"), "extra");
    await expect(
      verifyFormalPalettePackage(fixture.output),
    ).rejects.toMatchObject({ code: "FORMAL_PACKAGE_INVENTORY_MISMATCH" });
  });

  it("rejects an extra directory", async () => {
    const fixture = await createFormalFixture(false);
    await mkdir(path.join(fixture.output, "extra"));
    await expect(
      verifyFormalPalettePackage(fixture.output),
    ).rejects.toMatchObject({ code: "FORMAL_PACKAGE_INVENTORY_MISMATCH" });
  });

  it("rejects a missing approved artifact", async () => {
    const fixture = await createFormalFixture(false);
    await unlink(path.join(fixture.output, "manifest.json"));
    await expect(
      verifyFormalPalettePackage(fixture.output),
    ).rejects.toMatchObject({ code: "FORMAL_PACKAGE_INVENTORY_MISMATCH" });
  });

  it("rejects a missing approved source workbook", async () => {
    const fixture = await createFormalFixture(false);
    await unlink(
      path.join(fixture.output, "source", FORMAL_PALETTE_SOURCE_FILE_NAME),
    );
    await expect(
      verifyFormalPalettePackage(fixture.output),
    ).rejects.toMatchObject({ code: "FORMAL_PACKAGE_INVENTORY_MISMATCH" });
  });

  it("rejects artifact bytes that differ from deterministic recompilation", async () => {
    const fixture = await createFormalFixture(false);
    await writeFile(path.join(fixture.output, "manifest.json"), "{}\n");
    await expect(
      verifyFormalPalettePackage(fixture.output),
    ).rejects.toMatchObject({ code: "FORMAL_PACKAGE_CONTENT_MISMATCH" });
  });
});

async function createIncomingFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "poparooz-publish-"));
  temporaryRoots.push(root);
  const incoming = path.join(root, "incoming", FORMAL_PALETTE_SOURCE_FILE_NAME);
  const output = path.join(root, "published", "1.0.0");
  await mkdir(path.dirname(incoming), { recursive: true });
  await writeFile(incoming, sourceBytes);
  return { root, incoming, output };
}

async function createFormalFixture(withIncoming: boolean) {
  const fixture = await createIncomingFixture();
  await cp(approvedPackage, fixture.output, { recursive: true });
  if (!withIncoming) await unlink(fixture.incoming);
  return fixture;
}

function inject(
  overrides: Partial<FormalPaletteFileSystem>,
): FormalPaletteFileSystem {
  return { ...nodeFormalPaletteFileSystem, ...overrides };
}

function changedSourceBytes(): Buffer {
  const changed = Buffer.from(sourceBytes);
  changed[0] = changed[0] === 0 ? 1 : 0;
  return changed;
}

async function snapshotFormalPackage(
  outputDirectory: string,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    FORMAL_PALETTE_PACKAGE_INVENTORY.map(async (name) => [
      name,
      (await readFile(path.join(outputDirectory, name))).toString("base64"),
    ]),
  );
  return Object.fromEntries(entries);
}

function aggregateCauses(error: FormalPaletteCompilationError): unknown[] {
  expect(error.cause).toBeInstanceOf(AggregateError);
  return (error.cause as AggregateError).errors;
}

async function captureError(
  action: () => Promise<unknown>,
): Promise<FormalPaletteCompilationError> {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(FormalPaletteCompilationError);
    return error as FormalPaletteCompilationError;
  }
  throw new Error("Expected operation to fail.");
}
