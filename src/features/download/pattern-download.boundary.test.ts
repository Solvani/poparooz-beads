import { createHash } from "node:crypto";
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

  it("uses the approved pixel-preserving official logo asset", () => {
    const asset = readFileSync(
      join(process.cwd(), "src/assets/branding/poparooz-logo.png"),
    );
    const preparedSha256 = createHash("sha256").update(asset).digest("hex");
    const approvedPaddedSourceSha256 =
      "7114d4204dfed136ea05ed6457a03aab74dc28269a91eb47c095eaa5d405f62d";
    expect(preparedSha256).toBe(
      "28a6d5e49c411db4918dc00a0fa63396ae528610af118f4830fa36e00faeee47",
    );
    expect(preparedSha256).not.toBe(approvedPaddedSourceSha256);
    expect(asset.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(asset.readUInt32BE(16)).toBe(1154);
    expect(asset.readUInt32BE(20)).toBe(428);
    expect(asset[24]).toBe(8);
    expect(asset[25]).toBe(6);
  });
});
