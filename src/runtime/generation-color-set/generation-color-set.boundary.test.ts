// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const directory = path.dirname(fileURLToPath(import.meta.url));

describe("Generation Color Set browser boundary", () => {
  it.each([
    "color-set-to-generation.adapter.ts",
    "generation-color-set.schema.ts",
    "generation-palette-projection.ts",
  ])(
    "keeps %s free of Node, source, Lock, commerce, and remote dependencies",
    async (fileName) => {
      const source = await readFile(path.join(directory, fileName), "utf8");
      expect(source).not.toMatch(
        /node:|exceljs|\.xlsx|data-source|runtime-lock|fetch\(|XMLHttpRequest|shopify|inventory|pricing/i,
      );
    },
  );
});
