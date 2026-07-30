import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../domain/pattern/public-pattern.types";
import type { GenerationRuntime } from "../features/generator/generation.types";
import { createPublicPattern } from "../features/pattern-canvas/test/pattern-result";
import { App } from "./App";

const PUBLIC_RESULT = createPublicPattern();

function canvasContext() {
  return {
    createImageData: vi.fn((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb",
    })),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

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
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() =>
    canvasContext(),
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 600,
    bottom: 420,
    width: 600,
    height: 420,
    toJSON: () => ({}),
  } as DOMRect);
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
    expect(
      screen.queryByRole("img", { name: /Bead pattern preview/ }),
    ).toBeNull();

    await act(async () => resolveFirst(PUBLIC_RESULT));
    expect(screen.getByText("Pattern data is ready.")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Bead pattern preview, 2 columns by 2 rows.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pattern Summary" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 × 2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("1 board")).toHaveLength(2);

    await userEvent.clear(screen.getByLabelText("Maximum Colors"));
    await userEvent.type(screen.getByLabelText("Maximum Colors"), "20");
    expect(screen.getByText("Settings changed")).toBeInTheDocument();
    expect(
      screen.getByText("These details belong to your previous pattern."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Bead pattern preview/ }),
    ).toBeInTheDocument();
    const regenerate = screen.getByRole("button", {
      name: "Regenerate Pattern",
    });
    expect(regenerate).toBeEnabled();
    await userEvent.click(regenerate);
    expect(screen.getByText("Updating your pattern…")).toBeInTheDocument();
    expect(
      screen.getByText("Your previous pattern is still available."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Previous pattern details remain visible until the update is ready.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Bead pattern preview/ }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abort" }));
    expect(
      screen.getByText(
        "Pattern update stopped. Your previous pattern is still available.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pattern update stopped. These previous pattern details remain available.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Bead pattern preview/ }),
    ).toBeInTheDocument();
    await act(async () => resolveSecond(PUBLIC_RESULT));
    expect(screen.queryByText("Pattern data is ready.")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Remove Image" }));
    expect(
      screen.queryByRole("img", { name: /Bead pattern preview/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Pattern Summary" }),
    ).toBeNull();
  });

  it("fits a replacement result and retains it after a later regeneration error", async () => {
    let resolveFirst!: (value: PublicPatternResult) => void;
    let resolveSecond!: (value: PublicPatternResult) => void;
    let rejectThird!: (reason: Error) => void;
    const first = new Promise<PublicPatternResult>(
      (resolve) => void (resolveFirst = resolve),
    );
    const second = new Promise<PublicPatternResult>(
      (resolve) => void (resolveSecond = resolve),
    );
    const third = new Promise<PublicPatternResult>(
      (_, reject) => void (rejectThird = reject),
    );
    render(
      <App generationRuntime={availableRuntime([first, second, third])} />,
    );
    await completeInputs();

    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );
    await act(async () =>
      resolveFirst(createPublicPattern(20, 20, new Uint16Array(400))),
    );
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("125%")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Maximum Colors"));
    await userEvent.type(screen.getByLabelText("Maximum Colors"), "20");
    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate Pattern" }),
    );
    await act(async () =>
      resolveSecond(createPublicPattern(10, 5, new Uint16Array(50))),
    );
    expect(
      screen.getByRole("img", {
        name: "Bead pattern preview, 10 columns by 5 rows.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("10 × 5")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Maximum Colors"));
    await userEvent.type(screen.getByLabelText("Maximum Colors"), "24");
    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate Pattern" }),
    );
    await act(async () =>
      rejectThird(new Error("private regeneration detail")),
    );
    expect(
      screen.getByRole("img", {
        name: "Bead pattern preview, 10 columns by 5 rows.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("private regeneration detail")).toBeNull();
    expect(
      screen.getByText(
        "Pattern update failed. These previous pattern details remain available.",
      ),
    ).toBeInTheDocument();
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
    expect(
      screen.queryByRole("img", { name: /Bead pattern preview/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Pattern Summary" }),
    ).toBeNull();
  });

  it("never shows packaging, pricing, Shopify, or internal result fields", async () => {
    const result = createPublicPattern();
    const runtime = availableRuntime([
      Promise.resolve({
        ...result,
        materials: result.materials.map((material) => ({
          ...material,
          packSize: 1000,
          packsRequired: 1,
        })),
      }),
    ]);
    const { container } = render(<App generationRuntime={runtime} />);
    await completeInputs();
    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );
    await screen.findByRole("heading", { name: "Pattern Summary" });

    const visible = container.textContent ?? "";
    for (const forbidden of [
      "packSize",
      "packsRequired",
      "price",
      "inventory",
      "referenceCode",
      "variantId",
      "Shopify",
    ]) {
      expect(visible).not.toContain(forbidden);
    }
    expect(
      screen.getByRole("button", { name: "Download Pattern" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Get Beads for This Pattern" }),
    ).toBeDisabled();
  });

  it("keeps a valid Canvas and Generator success when only the results view is invalid", async () => {
    const result = createPublicPattern();
    const runtime = availableRuntime([
      Promise.resolve({
        ...result,
        totals: { ...result.totals, totalBeads: -1 },
      }),
    ]);
    render(<App generationRuntime={runtime} />);
    await completeInputs();
    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );

    expect(
      await screen.findByText("Pattern data is ready."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Bead pattern preview/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("We couldn’t display these pattern details."),
    ).toHaveAttribute("role", "status");
  });

  it("shows no result data after a first-generation abort", async () => {
    const pending = new Promise<PublicPatternResult>(() => undefined);
    render(<App generationRuntime={availableRuntime([pending])} />);
    await completeInputs();
    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Abort" }));

    expect(screen.getByText("Pattern generation stopped.")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Pattern Summary" }),
    ).toBeNull();
    expect(screen.queryByText("POP-RED")).toBeNull();
  });
});
