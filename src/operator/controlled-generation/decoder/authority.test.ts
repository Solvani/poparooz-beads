import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  EXPECTED_CONTROLLED_DECODER_AUTHORITY,
  hasExactAuthorityTuple,
  sha256Hex,
} from "./authority";

describe("controlled decoder artifact authority", () => {
  it("matches Web Crypto SHA-256 with an independent Node implementation", async () => {
    const bytes = new TextEncoder().encode("poparooz-controlled-decoder");
    expect(await sha256Hex(bytes)).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
  });

  it("accepts only the complete closed authority tuple", () => {
    expect(hasExactAuthorityTuple(EXPECTED_CONTROLLED_DECODER_AUTHORITY)).toBe(
      true,
    );
  });
});
