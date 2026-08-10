import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("A07 browser-local Pattern download boundary", () => {
  it("contains no network, persistence, Node, commerce, or internal identity path", () => {
    const source = ["pattern-export.ts", "pattern-download.ts"]
      .map((file) =>
        readFileSync(
          join(process.cwd(), "src/features/download", file),
          "utf8",
        ),
      )
      .join("\n");

    for (const forbidden of [
      "fetch(",
      "XMLHttpRequest",
      "FormData",
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "node:",
      "MARD",
      "supplier",
      "referenceCode",
      "variantId",
      "shopifyHandle",
      "packSize",
      "packsRequired",
      "inventory",
      "price",
      "schema",
      "SHA-256",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
