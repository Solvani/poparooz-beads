import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import { createApplicationRuntimeBootstrap } from "./application-runtime-bootstrap";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "Worker");
});

describe("Application startup integration", () => {
  it("creates the Provider before StrictMode render and keeps generation disabled", () => {
    const workerConstructor = vi.fn();
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: workerConstructor,
    });
    const createPaletteProvider = vi.fn(createApprovedRuntimePaletteProvider);
    const result = createApplicationRuntimeBootstrap({ createPaletteProvider });

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
    expect(workerConstructor).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Generate Pattern" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Pattern generation is not available in this preview."),
    ).toBeInTheDocument();
  });

  it("renders the same safe unavailable App after a Provider failure", () => {
    const result = createApplicationRuntimeBootstrap({
      createPaletteProvider: () => {
        throw new Error("internal initialization detail");
      },
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
});
