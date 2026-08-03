import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

describe("formal Palette incoming Git boundary", () => {
  it("ignores intake files while retaining .gitkeep and formal package files", () => {
    const incoming = checkIgnore("data-source/incoming/example.xlsx");
    const gitkeep = checkIgnore("data-source/incoming/.gitkeep");
    const formal = checkIgnore(
      "data-source/palettes/poparooz-standard/1.0.0/manifest.json",
    );

    expect(incoming.status).toBe(0);
    expect(incoming.stdout).toContain("data-source/incoming/*");
    expect(gitkeep.status).toBe(0);
    expect(gitkeep.stdout).toContain("!data-source/incoming/.gitkeep");
    expect(checkIgnore("data-source/incoming/.gitkeep", true).status).toBe(1);
    expect(formal.status).toBe(1);
  });
});

function checkIgnore(relativePath: string, quiet = false) {
  return spawnSync("git", ["check-ignore", quiet ? "-q" : "-v", relativePath], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}
