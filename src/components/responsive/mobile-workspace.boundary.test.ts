import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("P2-I08 responsive boundary", () => {
  it("freezes compact, tablet, desktop, Sheet, and safe-area CSS contracts", () => {
    const workspace = read("src/styles/workspace.css");
    const mobile = read("src/styles/mobile-workspace.css");

    expect(workspace).toContain("@container poparooz-app (min-width: 768px)");
    expect(workspace).toContain(
      "@container poparooz-app (min-width: 900px) and (max-width: 1399px)",
    );
    expect(workspace).toContain("@container poparooz-app (min-width: 1400px)");
    expect(workspace).toContain("320px minmax(0, 1fr)");
    expect(workspace).toContain("320px minmax(560px, 1fr) 340px");
    expect(workspace).toContain("workspace-shell--has-results");
    expect(mobile).toContain("max-height: 85dvh");
    expect(mobile).toContain("border-radius: 20px 20px 0 0");
    expect(mobile).toContain("env(safe-area-inset-bottom)");
    expect(mobile).toContain("animation: bottom-sheet-enter 240ms");
    expect(mobile).toContain("prefers-reduced-motion: reduce");
    expect(mobile).not.toContain("position: sticky");
  });

  it("contains no forbidden gesture, export, commerce, network, or persistence implementation", () => {
    const source = [
      "src/app/App.tsx",
      "src/components/mobile/BottomSheet.tsx",
      "src/components/mobile/BottomSheetTabs.tsx",
      "src/components/mobile/MobilePanelLaunchers.tsx",
      "src/components/mobile/use-bottom-sheet.ts",
      "src/components/responsive/use-workspace-mode.ts",
    ]
      .map(read)
      .join("\n");

    for (const forbidden of [
      "touchmove",
      "gesturestart",
      "canvas.toBlob",
      "canvas.toDataURL",
      "new Blob",
      "download=",
      "window.print",
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
