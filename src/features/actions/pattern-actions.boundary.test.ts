import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const PRODUCTION_ACTION_FILES = [
  "PatternActions.tsx",
  "PatternActionButton.tsx",
  "pattern-action-state.ts",
  "pattern-action.types.ts",
];

describe("P2-I07 future action boundary", () => {
  it("contains no export, navigation, commerce, network, or persistence implementation", () => {
    const source = PRODUCTION_ACTION_FILES.map((file) =>
      readFileSync(join(process.cwd(), "src/features/actions", file), "utf8"),
    ).join("\n");

    for (const forbidden of [
      "canvas.toBlob",
      "canvas.toDataURL",
      "new Blob",
      "download=",
      "window.print",
      "createObjectURL",
      "shopifyHandle",
      "variantId",
      "addToCart",
      "checkout",
      "packSize",
      "packsRequired",
      "price",
      "inventory",
      "fetch(",
      "XMLHttpRequest",
      "FormData",
      "localStorage",
      "sessionStorage",
      "indexedDB",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
