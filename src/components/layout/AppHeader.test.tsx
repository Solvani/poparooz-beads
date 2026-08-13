import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("renders the official logo without a duplicate wordmark", () => {
    render(<AppHeader />);

    const header = screen.getByRole("banner");
    const logo = screen.getByRole("img", { name: "Poparooz" });
    expect(logo.getAttribute("src")).toContain("poparooz-logo.png");
    expect(
      Array.from(
        header.querySelector(".app-header__inner")!.children,
        (element) => element.className,
      ),
    ).toEqual(["app-header__identity", "app-progress", "app-header__privacy"]);
    expect(header.querySelector(".app-header__wordmark")).toBeNull();
    expect(header.querySelector(".app-header__product")).toBeNull();
    expect(header).toHaveTextContent(
      "Your image is processed on this device and is not uploaded.",
    );
    expect(
      screen.getByRole("list", { name: "Pattern maker steps" }),
    ).toHaveTextContent("UploadSettingsGeneratePatternResults");
  });
});
