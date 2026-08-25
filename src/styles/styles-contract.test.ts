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
    expect(workspace).toContain("max-width: 1680px");
    expect(workspace).toContain("min-width: 0");
    expect(workspace).toContain("min-width: 768px");
    expect(workspace).toContain("min-width: 900px");
    expect(workspace).toContain("grid-template-columns: 320px minmax(0, 1fr)");
    expect(workspace).toContain("min-width: 1385px");
    expect(workspace).toContain(
      "grid-template-columns: 336px minmax(0, 1fr) 336px",
    );
    expect(workspace).toContain("gap: var(--space-5)");
    expect(workspace).toContain("box-shadow: var(--shadow-small)");
    expect(workspace).toContain(".canvas-toolbar__primary");
    expect(workspace).toContain(".canvas-toolbar__secondary");
    expect(workspace).toContain("flex-wrap: wrap");
    expect(workspace).toContain("@supports not (container-type: inline-size)");
  });

  it("keeps the official brand mark compact and proportional", () => {
    expect(workspace).toContain(".app-header__logo");
    expect(workspace).toContain("width: auto");
    expect(workspace).toContain("max-width: 100%");
    expect(workspace).toContain("height: 50px");
    expect(workspace).toContain("height: 38px");
    expect(workspace).toContain("object-fit: contain");
    expect(workspace).toContain(
      'grid-template-areas: "identity progress privacy"',
    );
    expect(workspace).toContain(
      "grid-template-columns: auto minmax(0, 1fr) minmax(220px, auto)",
    );
  });

  it("uses whole-card background selection and a compact Generate action", () => {
    expect(workspace).toContain(".background-setting input");
    expect(workspace).toContain("clip-path: inset(50%)");
    expect(workspace).toContain(
      ".background-setting label:has(input:focus-visible)",
    );
    expect(workspace).toContain("height: 52px");
    expect(workspace).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr))",
    );
    expect(workspace).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(workspace).toMatch(
      /@container poparooz-app \(max-width: 767px\)[\s\S]*?\.background-setting \{\s*grid-template-columns: minmax\(0, 1fr\);/,
    );
    expect(workspace).toContain(
      "@container poparooz-app (min-width: 900px) and (max-width: 1384px)",
    );
    expect(workspace).toContain(".generation-status__action");
    expect(workspace).not.toContain(
      ".pattern-settings > .generation-status .button",
    );
    expect(workspace).toContain("border-radius: 9px");
    expect(workspace).toContain("box-shadow: none");
    expect(workspace).toContain("white-space: nowrap");
    expect(workspace).not.toContain("background-setting__icon");
  });

  it("keeps the code-view Canvas square without changing the base preview viewport", () => {
    expect(workspace).toContain(".pattern-canvas__viewport--code");
    expect(workspace).toContain("aspect-ratio: 1 / 1");
    expect(workspace).toContain("width: min(100%, 720px)");
    expect(workspace).toContain("height: clamp(280px, 52vh, 720px)");
  });

  it("keeps zoom controls together while allowing the desktop toolbar to wrap", () => {
    expect(workspace).toContain(
      ".canvas-toolbar__secondary-controls {\n  display: contents;",
    );
    expect(workspace).toMatch(
      /\.canvas-toolbar__zoom-controls \{[\s\S]*?flex-wrap: nowrap;/,
    );
    expect(workspace).toMatch(
      /\.canvas-toolbar__secondary \{[\s\S]*?display: grid;[\s\S]*?width: fit-content;[\s\S]*?max-width: 100%;[\s\S]*?flex: 0 0 auto;[\s\S]*?justify-items: start;/,
    );
    expect(
      workspace.match(
        /\.workspace-shell \.canvas-toolbar \{[\s\S]*?flex-wrap: wrap;/g,
      ),
    ).toHaveLength(2);
    expect(
      workspace.match(
        /\.workspace-shell \.canvas-toolbar__secondary-controls \{[\s\S]*?flex: 0 0 auto;[\s\S]*?flex-wrap: nowrap;[\s\S]*?margin-left: auto;/g,
      ),
    ).toHaveLength(2);
    expect(
      workspace.match(
        /\.workspace-shell \.canvas-toolbar__primary \{[\s\S]*?width: auto;[\s\S]*?flex: 1 1 auto;/g,
      ),
    ).toHaveLength(2);
  });

  it("keeps the desktop shell stable while generated content follows top-aligned natural flow", () => {
    expect(workspace).toContain(
      "--desktop-workspace-height: clamp(720px, calc(100dvh - 104px), 820px)",
    );
    expect(workspace).toContain(
      "grid-template-rows: auto minmax(var(--desktop-workspace-height), auto)",
    );
    expect(workspace).toContain("align-items: stretch");
    expect(workspace).toContain(".workspace-shell > .panel");
    expect(workspace).toContain(".workspace-shell--has-results .color-list");
    expect(workspace).toContain("grid-template-rows: auto auto auto");
    expect(workspace).toContain("align-content: start");
    expect(workspace).toContain("max-height: 168px");
    expect(workspace).toContain("overscroll-behavior: contain");
    expect(workspace).not.toContain("flex: 1 1 160px");
    expect(workspace).toContain(".results-empty-state");
    expect(workspace).not.toContain("margin-top: auto");
    expect(workspace).not.toContain(
      ".workspace-shell--has-results .workspace-shell__settings > .panel__body",
    );
    expect(workspace).not.toContain(
      ".workspace-shell--has-results .pattern-settings .generation-status",
    );
  });
});
