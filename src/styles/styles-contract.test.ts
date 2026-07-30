import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const readStyle = (name: string) =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");

describe("Poparooz Craft UI v1 CSS contract", () => {
  const tokens = readStyle("./tokens.css");
  const foundations = readStyle("./foundations.css");
  const workspace = readStyle("./workspace.css");

  it("defines the frozen brand, layout, and control tokens", () => {
    for (const declaration of [
      "--brand-50: #f1f8f6",
      "--brand-500: #43877a",
      "--brand-900: #1d3d38",
      "--page-background: #f7f6f2",
      "--text-primary: #1f2926",
      "--minimum-touch-target: 44px",
      "--control-height-desktop: 44px",
      "--control-height-mobile: 48px",
    ]) {
      expect(tokens).toContain(declaration);
    }
  });

  it("keeps 16px body text, visible focus, and reduced-motion support", () => {
    expect(foundations).toContain("font-size: 16px");
    expect(foundations).toContain(":focus-visible");
    expect(foundations).toContain("outline: 3px solid var(--brand-600)");
    expect(workspace).toContain(
      ".image-upload input:focus-visible + .image-upload__button",
    );
    expect(workspace).toContain("outline: 3px solid var(--brand-600)");
    expect(foundations).toContain("prefers-reduced-motion: reduce");
  });

  it("defines all four layouts and a media-query fallback", () => {
    expect(workspace).toContain("container-type: inline-size");
    expect(workspace).toContain("max-width: 1600px");
    expect(workspace).toContain("min-width: 0");
    expect(workspace).toContain("min-width: 768px");
    expect(workspace).toContain("min-width: 1100px");
    expect(workspace).toContain(
      "grid-template-columns: 280px minmax(0, 1fr) 300px",
    );
    expect(workspace).toContain("min-width: 1440px");
    expect(workspace).toContain(
      "grid-template-columns: 320px minmax(560px, 1fr) 340px",
    );
    expect(workspace).toContain("@supports not (container-type: inline-size)");
  });
});
