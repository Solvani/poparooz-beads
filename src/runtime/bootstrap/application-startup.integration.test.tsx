import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { createApprovedBoardProfileProvider } from "../board-profile/approved-board-profile";
import { adaptBoardProfileToGeneration } from "../generation-board-profile/board-profile-to-generation.adapter";
import { adaptRuntimePaletteToGeneration } from "../generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import { createApplicationRuntimeBootstrap } from "./application-runtime-bootstrap";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "Worker");
});

describe("Application startup integration", () => {
  it("creates the Provider before StrictMode render and keeps generation disabled", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const workerConstructor = vi.fn();
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: workerConstructor,
    });
    const createPaletteProvider = vi.fn(createApprovedRuntimePaletteProvider);
    const createBoardProfileProvider = vi.fn(
      createApprovedBoardProfileProvider,
    );
    const result = createApplicationRuntimeBootstrap({
      createPaletteProvider,
      adaptPalette: adaptRuntimePaletteToGeneration,
      createBoardProfileProvider,
      adaptBoardProfile: adaptBoardProfileToGeneration,
    });

    const view = render(
      <StrictMode>
        <App generationRuntime={result.generationRuntime} />
      </StrictMode>,
    );
    view.rerender(
      <StrictMode>
        <App generationRuntime={result.generationRuntime} />
      </StrictMode>,
    );

    expect(createPaletteProvider).toHaveBeenCalledOnce();
    expect(createBoardProfileProvider).toHaveBeenCalledOnce();
    expect(workerConstructor).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Generate Pattern" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Pattern generation is not available in this preview."),
    ).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("renders the same safe unavailable App after a Provider failure", () => {
    const result = createApplicationRuntimeBootstrap({
      createPaletteProvider: () => {
        throw new Error("internal initialization detail");
      },
      adaptPalette: adaptRuntimePaletteToGeneration,
      createBoardProfileProvider: createApprovedBoardProfileProvider,
      adaptBoardProfile: adaptBoardProfileToGeneration,
    });

    render(<App generationRuntime={result.generationRuntime} />);

    expect(result.status).toBe("palette-unavailable");
    expect(
      screen.getByRole("button", { name: "Generate Pattern" }),
    ).toBeDisabled();
    expect(document.body.textContent).not.toMatch(
      /internal initialization detail|zod|stack|sha-?256|runtime-palette\.json/i,
    );
  });

  it("renders the safe unavailable App after a BoardProfile failure", () => {
    const workerConstructor = vi.fn();
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: workerConstructor,
    });
    const result = createApplicationRuntimeBootstrap({
      createPaletteProvider: createApprovedRuntimePaletteProvider,
      adaptPalette: adaptRuntimePaletteToGeneration,
      createBoardProfileProvider: () => {
        throw new Error("private board evidence detail");
      },
      adaptBoardProfile: adaptBoardProfileToGeneration,
    });

    render(<App generationRuntime={result.generationRuntime} />);

    expect(result.status).toBe("board-profile-unavailable");
    expect(workerConstructor).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Generate Pattern" }),
    ).toBeDisabled();
    expect(document.body.textContent).not.toMatch(
      /private board evidence detail|zod|stack|board-profile\.json/i,
    );
  });
});
