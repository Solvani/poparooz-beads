import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { createApprovedBoardProfileProvider } from "../board-profile/approved-board-profile";
import { adaptBoardProfileToGeneration } from "../generation-board-profile/board-profile-to-generation.adapter";
import { adaptRuntimePaletteToGeneration } from "../generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import { createApprovedColorSetProvider } from "../color-set/approved-color-set";
import { adaptColorSetToGeneration } from "../generation-color-set/color-set-to-generation.adapter";
import { createApplicationRuntimeBootstrap } from "./application-runtime-bootstrap";
import { createApprovedProcessingPolicyProvider } from "../processing-policy/approved-processing-policy";
import { createGenerationRuntime } from "../../features/generator/generation-service";

const createWorkerClient = () => ({
  quantize: vi.fn(),
  dispose: vi.fn(),
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "Worker");
});

describe("Application startup integration", () => {
  it("creates the Runtime before StrictMode render while keeping Worker creation lazy", () => {
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
      createColorSetProvider: createApprovedColorSetProvider,
      adaptColorSets: adaptColorSetToGeneration,
      createBoardProfileProvider,
      adaptBoardProfile: adaptBoardProfileToGeneration,
      createProcessingPolicyProvider: createApprovedProcessingPolicyProvider,
      createWorkerClient,
      createGenerationRuntime,
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
    expect(result.generationRuntime.availability.available).toBe(true);
    expect(screen.getByLabelText("Bead Color Set")).toHaveValue(
      "poparooz-set-221",
    );
    expect(screen.queryByText(/not available in this preview/i)).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("renders the same safe unavailable App after a Provider failure", () => {
    const result = createApplicationRuntimeBootstrap({
      createPaletteProvider: () => {
        throw new Error("internal initialization detail");
      },
      adaptPalette: adaptRuntimePaletteToGeneration,
      createColorSetProvider: createApprovedColorSetProvider,
      adaptColorSets: adaptColorSetToGeneration,
      createBoardProfileProvider: createApprovedBoardProfileProvider,
      adaptBoardProfile: adaptBoardProfileToGeneration,
      createProcessingPolicyProvider: createApprovedProcessingPolicyProvider,
      createWorkerClient,
      createGenerationRuntime,
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
      createColorSetProvider: createApprovedColorSetProvider,
      adaptColorSets: adaptColorSetToGeneration,
      createBoardProfileProvider: () => {
        throw new Error("private board evidence detail");
      },
      adaptBoardProfile: adaptBoardProfileToGeneration,
      createProcessingPolicyProvider: createApprovedProcessingPolicyProvider,
      createWorkerClient,
      createGenerationRuntime,
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
