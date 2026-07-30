import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:app-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("App", () => {
  it("renders the Poparooz header and three empty workspace regions", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toHaveTextContent("Poparooz");
    expect(
      screen.getByRole("main", { name: "Pattern maker workspace" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Start with an image")).toBeInTheDocument();
    expect(
      screen.getByText("Your pattern will appear here."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your pattern details will appear here."),
    ).toBeInTheDocument();
  });

  it("contains no synthetic pattern values or internal customer-forbidden fields", () => {
    const { container } = render(<App />);
    const page = container.textContent ?? "";

    for (const forbidden of [
      "MARD",
      "referenceSystem",
      "referenceCode",
      "referenceName",
      "referenceSeries",
      "variantId",
      "shopifyHandle",
      "29×29",
      "40×40",
    ]) {
      expect(page).not.toContain(forbidden);
    }
  });

  it("moves from local upload to preview and back without changing settings", async () => {
    render(<App />);
    const width = screen.getByLabelText("Pattern Width");
    await userEvent.type(width, "64");
    await userEvent.upload(
      screen.getByLabelText("Choose an Image"),
      new File(["image"], "photo.png", { type: "image/png" }),
    );

    expect(
      screen.getByRole("img", { name: "Preview of the selected image" }),
    ).toHaveAttribute("src", "blob:app-preview");
    expect(
      screen.getByText(
        "Your image is ready. Generate the pattern in the next step.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Pattern Width")).toHaveValue(64);

    await userEvent.click(screen.getByRole("button", { name: "Remove Image" }));

    expect(screen.getByLabelText("Choose an Image")).toBeInTheDocument();
    expect(screen.getByLabelText("Pattern Width")).toHaveValue(64);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:app-preview");
  });

  it("does not use network or persistent storage when selecting an image", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<App />);

    await userEvent.upload(
      screen.getByLabelText("Choose an Image"),
      new File(["image"], "photo.webp", { type: "image/webp" }),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
