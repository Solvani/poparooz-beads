import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../domain/pattern/public-pattern.types";
import type { GenerationRuntime } from "../features/generator/generation.types";
import { createPublicPattern } from "../features/pattern-canvas/test/pattern-result";
import { App } from "./App";

const PUBLIC_RESULT = withColorCodes(createPublicPattern(), ["A4", "A10"]);
const COLOR_SET_PROFILES = [
  { profileId: "poparooz-set-24", size: 24 },
  { profileId: "poparooz-set-48", size: 48 },
  { profileId: "poparooz-set-72", size: 72 },
  { profileId: "poparooz-set-120", size: 120 },
  { profileId: "poparooz-set-168", size: 168 },
  { profileId: "poparooz-set-221", size: 221 },
] as const;

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
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

type AvailableGenerationRuntime = Extract<
  GenerationRuntime,
  { readonly availability: { readonly available: true } }
>;

function availableRuntime(
  tasks: readonly Promise<PublicPatternResult>[],
): AvailableGenerationRuntime {
  let index = 0;
  return {
    availability: { available: true },
    service: { generate: vi.fn(() => tasks[index++]!) },
    colorSetProfiles: COLOR_SET_PROFILES,
  };
}

function withSingleColorCode(
  pattern: PublicPatternResult,
  code: string,
): PublicPatternResult {
  const source = pattern.colors[0]!;
  const color = Object.freeze({ ...source.color, code });
  const entry = Object.freeze({ ...source, color });
  return Object.freeze({
    ...pattern,
    colors: Object.freeze([entry]),
    materials: Object.freeze([
      Object.freeze({
        ...pattern.materials[0]!,
        color,
      }),
    ]),
  });
}

function withColorCodes(
  pattern: PublicPatternResult,
  codes: readonly string[],
): PublicPatternResult {
  if (codes.length !== pattern.colors.length) {
    throw new TypeError("Color code fixtures must preserve Pattern colors.");
  }
  const colors = pattern.colors.map((entry, index) =>
    Object.freeze({
      ...entry,
      color: Object.freeze({ ...entry.color, code: codes[index]! }),
    }),
  );
  const colorsByIndex = new Map(colors.map((entry) => [entry.index, entry]));
  return Object.freeze({
    ...pattern,
    colors: Object.freeze(colors),
    materials: Object.freeze(
      pattern.materials.map((material) =>
        Object.freeze({
          ...material,
          color: colorsByIndex.get(material.patternColorIndex)!.color,
        }),
      ),
    ),
  });
}

async function completeInputs() {
  await userEvent.upload(
    screen.getByLabelText("Choose Image"),
    new File(["image"], "photo.png", { type: "image/png" }),
  );
  await userEvent.clear(screen.getByLabelText("Maximum Colors"));
  await userEvent.type(screen.getByLabelText("Maximum Colors"), "16");
  await userEvent.click(screen.getByRole("radio", { name: /Full Background/ }));
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
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["png"], { type: "image/png" })),
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
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  document.body.removeAttribute("style");
  Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
});

describe("App", () => {
  it("renders the Poparooz header without a permanent pre-generation Summary", () => {
    render(<App />);

    expect(
      screen.getByRole("banner").querySelector("img[alt='Poparooz']"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("main", { name: "Pattern maker workspace" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1. Upload Image")).toBeInTheDocument();
    expect(screen.getByText("Pattern Canvas")).toBeInTheDocument();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Save / Download" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Save / Download Pattern" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Get Beads for This Pattern" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Bead Set Requirements" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Recommended Board Setup" }),
    ).toBeNull();
  });

  it("contains no synthetic pattern values or internal customer-forbidden fields", () => {
    const { container } = render(<App />);
    const page = container.textContent ?? "";

    expect(page).not.toMatch(/[\u3400-\u9fff]/u);

    for (const forbidden of [
      "MARD",
      "referenceSystem",
      "referenceCode",
      "referenceName",
      "referenceSeries",
      "variantId",
      "shopifyHandle",
      "29×29",
    ]) {
      expect(page).not.toContain(forbidden);
    }
  });

  it("moves from local upload to preview and back without changing settings", async () => {
    render(<App />);
    await userEvent.selectOptions(screen.getByLabelText("Pattern Size"), "60");
    await userEvent.upload(
      screen.getByLabelText("Choose Image"),
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
    expect(screen.getByLabelText("Pattern Size")).toHaveValue("60");

    await userEvent.click(screen.getByRole("button", { name: "Remove Image" }));

    expect(screen.getByLabelText("Choose Image")).toBeInTheDocument();
    expect(screen.getByLabelText("Pattern Size")).toHaveValue("60");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:app-preview");
  });

  it("does not use network or persistent storage when selecting an image", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<App />);

    await userEvent.upload(
      screen.getByLabelText("Choose Image"),
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
    await userEvent.selectOptions(
      screen.getByLabelText("Bead Color Set"),
      "poparooz-set-72",
    );

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
    expect(
      screen.queryByRole("region", { name: "Save / Download" }),
    ).toBeNull();
    expect(
      screen.queryByText("These actions apply to your previous pattern."),
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
    expect(screen.getByText("1 × 52×52 Board")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Save / Download" }),
    ).toHaveTextContent("Download your color code pattern as a PNG.");
    const summarySection = screen
      .getByRole("heading", { name: "Pattern Summary" })
      .closest("section")!;
    const packageRow = within(summarySection)
      .getByText("Generation Color Set")
      .closest("div")!;
    const beadRecommendation = screen
      .getByRole("heading", { name: "Recommended Bead Set" })
      .closest<HTMLElement>(".bead-set-requirements__item")!;
    expect(within(packageRow).getByText("72-Color Set")).toBeInTheDocument();
    expect(
      within(summarySection).getByText("Full Background"),
    ).toBeInTheDocument();
    expect(
      within(beadRecommendation).getByText("48-Color Set"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Color Code View" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Fit to Screen" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "More controls" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Read Codes" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Color Preview" }),
    );
    expect(runtime.service.generate).toHaveBeenCalledOnce();

    await userEvent.selectOptions(
      screen.getByLabelText("Bead Color Set"),
      "poparooz-set-221",
    );
    await userEvent.click(
      screen.getByRole("radio", { name: /Remove Background/ }),
    );
    expect(within(packageRow).getByText("72-Color Set")).toBeInTheDocument();
    expect(
      within(summarySection).getByText("Full Background"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Remove Background", {
        selector: ".pattern-summary-list dd",
      }),
    ).toBeNull();
    expect(
      within(beadRecommendation).getByText("48-Color Set"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 × 52×52 Board")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Maximum Colors"));
    await userEvent.type(screen.getByLabelText("Maximum Colors"), "20");
    expect(screen.getByText("Settings changed")).toBeInTheDocument();
    expect(
      screen.getByText("These details belong to your previous pattern."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("These actions apply to your previous pattern."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Bead pattern preview/ }),
    ).toBeInTheDocument();
    expect(
      within(beadRecommendation).getByText("48-Color Set"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 × 52×52 Board")).toBeInTheDocument();
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
      screen.getByText(
        "Your previous pattern remains available while the update is processing.",
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
      screen.getByText(
        "Pattern update stopped. These actions still apply to your previous pattern.",
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
    expect(
      screen.queryByRole("region", { name: "Save / Download" }),
    ).toBeNull();
    expect(screen.queryByText(/These actions (apply|still apply)/)).toBeNull();
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
    await userEvent.click(
      screen.getByRole("button", { name: "More controls" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("125%")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Maximum Colors"));
    await userEvent.type(screen.getByLabelText("Maximum Colors"), "20");
    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate Pattern" }),
    );
    await act(async () =>
      resolveSecond(
        withSingleColorCode(
          createPublicPattern(60, 60, new Uint16Array(3_600)),
          "A20",
        ),
      ),
    );
    expect(
      screen.getByRole("img", {
        name: "Bead pattern preview, 60 columns by 60 rows.",
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "More controls" }),
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("60 × 60")).toBeInTheDocument();
    expect(screen.getByText("3,600")).toBeInTheDocument();
    expect(screen.getByText("1 × 78×78 Board")).toBeInTheDocument();
    expect(
      within(
        screen
          .getByRole("heading", { name: "Recommended Bead Set" })
          .closest<HTMLElement>(".bead-set-requirements__item")!,
      ).getByText("221-Color Set"),
    ).toBeInTheDocument();

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
        name: "Bead pattern preview, 60 columns by 60 rows.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 × 78×78 Board")).toBeInTheDocument();
    expect(screen.queryByText("private regeneration detail")).toBeNull();
    expect(
      screen.getByText(
        "Pattern update failed. These previous pattern details remain available.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pattern update failed. These actions still apply to your previous pattern.",
      ),
    ).toBeInTheDocument();
  });

  it("never renders a raw injected service exception", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 600,
    });
    const runtime: GenerationRuntime = {
      availability: { available: true },
      service: {
        generate: vi.fn(async () => {
          throw new Error("C:\\private\\photo.png internal stack");
        }),
      },
      colorSetProfiles: COLOR_SET_PROFILES,
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
    expect(
      screen.getByRole("region", { name: "1. Upload Image" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Pattern detail panels" }),
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Save / Download" }),
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
      screen.getByRole("button", { name: "Save / Download Pattern" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Get Beads for This Pattern" }),
    ).not.toBeInTheDocument();
  });

  it("keeps color focus presentation-only and clears it without regeneration", async () => {
    const result = createPublicPattern();
    const runtime = availableRuntime([Promise.resolve(result)]);
    const originalMatrix = Array.from(result.matrix.colorIndices);
    render(<App generationRuntime={runtime} />);
    await completeInputs();
    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );
    await screen.findByRole("heading", { name: "Pattern Summary" });

    const first = screen.getByRole("button", { name: "A1, 2 beads" });
    const second = screen.getByRole("button", { name: "B1, 1 bead" });
    const recommendationsBeforeHighlight = Array.from(
      document.querySelectorAll(".result-recommendation"),
      (section) => section.textContent,
    );
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("button", { name: "Clear Highlight" }),
    ).toBeNull();

    await userEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Highlighted")).toBeInTheDocument();

    await userEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(second);
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(
      screen.getByRole("button", { name: "Clear Highlight" }),
    );
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "false");
    expect(runtime.service.generate).toHaveBeenCalledOnce();
    expect(Array.from(result.matrix.colorIndices)).toEqual(originalMatrix);
    expect(
      Array.from(
        document.querySelectorAll(".result-recommendation"),
        (section) => section.textContent,
      ),
    ).toEqual(recommendationsBeforeHighlight);
    expect(
      screen.getByText("Total Beads").nextElementSibling,
    ).toHaveTextContent("3");
    const boardSection = screen
      .getByRole("heading", { name: "Recommended Board Setup" })
      .closest("section")!;
    expect(
      within(boardSection).getByText("1 × 52×52 Board"),
    ).toBeInTheDocument();
    expect(screen.getByText("72-Color Set")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save / Download Pattern" }),
    ).toBeEnabled();
  });

  it("downloads locally without commerce side effects", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: vi.fn(async () => {}),
    });
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
      1154,
    );
    vi.spyOn(
      HTMLImageElement.prototype,
      "naturalHeight",
      "get",
    ).mockReturnValue(428);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const openSpy = vi.spyOn(window, "open");
    const pushStateSpy = vi.spyOn(history, "pushState");
    const replaceStateSpy = vi.spyOn(history, "replaceState");
    const runtime = availableRuntime([Promise.resolve(PUBLIC_RESULT)]);
    render(<App generationRuntime={runtime} />);
    await completeInputs();
    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );
    await screen.findByRole("heading", { name: "Pattern Summary" });
    const focusedRow = screen.getByRole("button", { name: "A4, 2 beads" });
    await userEvent.click(focusedRow);
    expect(focusedRow).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(
      screen.getByRole("button", { name: "Save / Download Pattern" }),
    );
    await waitFor(() => expect(anchorClickSpy).toHaveBeenCalledOnce());
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(runtime.service.generate).toHaveBeenCalledOnce();
    expect(focusedRow).toHaveAttribute("aria-pressed", "true");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:app-preview");
    expect(document.querySelector("a[download]")).toBeNull();
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
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 600,
    });
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
    expect(screen.queryByText("A1")).toBeNull();
    expect(
      screen.getByRole("region", { name: "1. Upload Image" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Pattern detail panels" }),
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Save / Download" }),
    ).toBeNull();
  });

  it("runs the compact result-first flow with inline bead requirements and recovery sheets", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    let resolveFirst!: (value: PublicPatternResult) => void;
    let resolveSecond!: (value: PublicPatternResult) => void;
    const first = new Promise<PublicPatternResult>(
      (resolve) => void (resolveFirst = resolve),
    );
    const second = new Promise<PublicPatternResult>(
      (resolve) => void (resolveSecond = resolve),
    );
    render(<App generationRuntime={availableRuntime([first, second])} />);
    await completeInputs();

    expect(
      screen.getByRole("region", { name: "1. Upload Image" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Pattern detail panels" }),
    ).toBeNull();
    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );
    await act(async () => resolveFirst(PUBLIC_RESULT));

    expect(
      screen.queryByRole("region", { name: "1. Upload Image" }),
    ).toBeNull();
    expect(
      screen.getByRole("region", { name: "Pattern status" }),
    ).toHaveTextContent("Pattern data is ready.");
    expect(
      screen.getByRole("img", { name: /Bead pattern preview/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 × 2")).toBeInTheDocument();
    expect(screen.getByText("Colors Used")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bead Requirements" }),
    ).toBeInTheDocument();
    const compactContent = document.querySelector<HTMLElement>(
      ".compact-result-content",
    )!;
    const compactSummary = within(compactContent).getByRole("heading", {
      name: "Pattern Summary",
    });
    const compactBeadSet = within(compactContent).getByRole("heading", {
      name: "Bead Set Requirements",
    });
    const compactBoardSetup = within(compactContent).getByRole("heading", {
      name: "Recommended Board Setup",
    });
    const compactRequirements = within(compactContent).getByRole("heading", {
      name: "Bead Requirements",
    });
    const compactDownload = within(compactContent).getByRole("button", {
      name: "Save / Download Pattern",
    });
    expect(
      compactSummary.compareDocumentPosition(compactRequirements) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      compactSummary.compareDocumentPosition(compactBeadSet) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      compactBeadSet.compareDocumentPosition(compactBoardSetup) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      compactBoardSetup.compareDocumentPosition(compactRequirements) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      compactRequirements.compareDocumentPosition(compactDownload) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(compactContent).getAllByRole("heading", {
        name: "Bead Requirements",
      }),
    ).toHaveLength(1);
    const launchers = screen.getByRole("navigation", {
      name: "Pattern detail panels",
    });
    expect(
      Array.from(launchers.querySelectorAll("button")).map((button) =>
        button.textContent?.replace("›", ""),
      ),
    ).toEqual(["Settings", "Original"]);

    expect(screen.getByText("A4")).toBeInTheDocument();
    const compactColorRow = screen.getByRole("button", {
      name: "A4, 2 beads",
    });
    await userEvent.click(compactColorRow);
    expect(compactColorRow).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Clear Highlight" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Clear Highlight" }),
    );
    expect(compactColorRow).toHaveAttribute("aria-pressed", "false");

    const originalLauncher = screen.getByRole("button", { name: "Original" });
    await userEvent.click(originalLauncher);
    expect(
      screen.getByRole("dialog", { name: "Original" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Preview of the selected image" }),
    ).toHaveAttribute("src", "blob:app-preview");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await new Promise(requestAnimationFrame);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".app-root")).not.toHaveAttribute("inert");
    expect(originalLauncher).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    await userEvent.clear(screen.getByLabelText("Maximum Colors"));
    await userEvent.type(screen.getByLabelText("Maximum Colors"), "20");
    expect(
      within(screen.getByRole("dialog", { name: "Settings" })).getByText(
        "Settings changed",
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate Pattern" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Updating your pattern…")).toBeInTheDocument();

    expect(screen.getByText("A4")).toBeInTheDocument();
    await act(async () =>
      resolveSecond(createPublicPattern(2, 2, [1, 1, 65535, 1])),
    );
    expect(screen.getByText("B1")).toBeInTheDocument();
    expect(screen.queryByText("A1")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Original" }));
    await userEvent.upload(
      screen.getByLabelText("Replace Image"),
      new File(["next"], "next.webp", { type: "image/webp" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("button", { name: "Original" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove Image" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("region", { name: "1. Upload Image" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Pattern detail panels" }),
    ).toBeNull();
    expect(
      screen.queryByRole("img", { name: /Bead pattern preview/ }),
    ).toBeNull();
    const ids = Array.from(
      document.querySelectorAll("[id]"),
      (node) => node.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("closes the compact sheet and preserves Canvas state when entering medium mode", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    render(
      <App
        generationRuntime={availableRuntime([
          Promise.resolve(createPublicPattern(20, 20, new Uint16Array(400))),
        ])}
      />,
    );
    await completeInputs();
    await userEvent.click(
      await screen.findByRole("button", { name: "Generate Pattern" }),
    );
    await screen.findByText("Colors Used");
    await userEvent.click(
      screen.getByRole("button", { name: "More controls" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("125%")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Original" }));
    expect(
      screen.getByRole("dialog", { name: "Original" }),
    ).toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
    });
    act(() => window.dispatchEvent(new Event("resize")));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".app-root")).not.toHaveAttribute("inert");
    expect(document.body.style.position).toBe("");
    expect(
      screen.getByRole("main", { name: "Pattern maker workspace" }),
    ).toHaveAttribute("data-workspace-mode", "medium");
    expect(
      screen.getByRole("region", { name: "1. Upload Image" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Pattern detail panels" }),
    ).toBeNull();
    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recommended Board Setup" }),
    ).toBeInTheDocument();
  });
});
