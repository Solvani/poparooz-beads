import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../domain/pattern/public-pattern.types";
import type { GenerationRuntime } from "../features/generator/generation.types";
import { App } from "./App";

const PUBLIC_RESULT = { marker: "ready" } as unknown as PublicPatternResult;

function availableRuntime(
  tasks: readonly Promise<PublicPatternResult>[],
): GenerationRuntime {
  let index = 0;
  return {
    availability: { available: true },
    service: { generate: vi.fn(() => tasks[index++]!) },
  };
}

async function completeInputs() {
  await userEvent.upload(
    screen.getByLabelText("Choose an Image"),
    new File(["image"], "photo.png", { type: "image/png" }),
  );
  await userEvent.type(screen.getByLabelText("Pattern Width"), "32");
  await userEvent.type(screen.getByLabelText("Pattern Height"), "24");
  await userEvent.type(screen.getByLabelText("Maximum Colors"), "16");
  await userEvent.click(screen.getByRole("radio", { name: "White" }));
}

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

  it("keeps Generate unavailable without approved runtime dependencies", async () => {
    render(<App />);
    await completeInputs();

    expect(
      screen.getByRole("button", { name: "Generate Pattern" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Pattern generation is not available in this preview."),
    ).toBeInTheDocument();
  });

  it("drives processing, success, dirty, regeneration, and abort through an injected service", async () => {
    let resolveFirst!: (value: PublicPatternResult) => void;
    let resolveSecond!: (value: PublicPatternResult) => void;
    const first = new Promise<PublicPatternResult>(
      (resolve) => void (resolveFirst = resolve),
    );
    const second = new Promise<PublicPatternResult>(
      (resolve) => void (resolveSecond = resolve),
    );
    const runtime = availableRuntime([first, second]);
    render(<App generationRuntime={runtime} />);
    await completeInputs();

    const generate = await screen.findByRole("button", {
      name: "Generate Pattern",
    });
    await waitFor(() => expect(generate).toBeEnabled());
    await userEvent.click(generate);
    expect(screen.getByText("Creating your pattern…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abort" })).toBeEnabled();

    await act(async () => resolveFirst(PUBLIC_RESULT));
    expect(screen.getByText("Pattern data is ready.")).toBeInTheDocument();
    expect(document.querySelector("canvas")).toBeNull();

    await userEvent.clear(screen.getByLabelText("Maximum Colors"));
    await userEvent.type(screen.getByLabelText("Maximum Colors"), "20");
    expect(screen.getByText("Settings changed")).toBeInTheDocument();
    const regenerate = screen.getByRole("button", {
      name: "Regenerate Pattern",
    });
    expect(regenerate).toBeEnabled();
    await userEvent.click(regenerate);
    expect(screen.getByText("Updating your pattern…")).toBeInTheDocument();
    expect(
      screen.getByText("Your previous pattern is still available."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Abort" }));
    expect(
      screen.getByText(
        "Pattern update stopped. Your previous pattern is still available.",
      ),
    ).toBeInTheDocument();
    await act(async () => resolveSecond(PUBLIC_RESULT));
    expect(screen.queryByText("Pattern data is ready.")).toBeNull();
  });

  it("never renders a raw injected service exception", async () => {
    const runtime: GenerationRuntime = {
      availability: { available: true },
      service: {
        generate: vi.fn(async () => {
          throw new Error("C:\\private\\photo.png internal stack");
        }),
      },
    };
    const { container } = render(<App generationRuntime={runtime} />);
    await completeInputs();
    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );

    expect(
      await screen.findByText(
        "We couldn’t create this pattern. Your image and settings are still available.",
      ),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent("private");
    expect(container).not.toHaveTextContent("internal stack");
  });
});
