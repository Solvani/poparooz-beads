// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { RuntimePaletteBrowserError } from "../palette/runtime-palette.errors";
import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import {
  bootstrapApprovedApplicationRuntime,
  createApplicationRuntimeBootstrap,
} from "./application-runtime-bootstrap";
import { startApplication } from "./application-startup";

describe("Application Runtime Bootstrap", () => {
  it("creates one approved Provider while keeping GenerationRuntime unavailable", () => {
    const provider = createApprovedRuntimePaletteProvider();
    const createPaletteProvider = vi.fn(() => provider);

    const result = createApplicationRuntimeBootstrap({ createPaletteProvider });

    expect(createPaletteProvider).toHaveBeenCalledOnce();
    expect(result.status).toBe("palette-ready");
    if (result.status !== "palette-ready") throw new Error("Unexpected status");
    expect(result.paletteProvider).toBe(provider);
    expect(result.paletteProvider.getSnapshot()).toMatchObject({
      paletteId: "poparooz-standard",
      paletteVersion: "1.0.0",
      artifactVersion: "1.0.0",
      recordCount: 221,
      activeCount: 221,
      autoMatchEligibleCount: 221,
    });
    expect(result.generationRuntime).toEqual({
      availability: {
        available: false,
        reason: "production-runtime-unavailable",
      },
    });
    expect(result.generationRuntime.service).toBeUndefined();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("boots with the real approved Provider and no Generation Service", () => {
    const result = bootstrapApprovedApplicationRuntime();
    expect(result.status).toBe("palette-ready");
    expect(result.paletteProvider).not.toBeNull();
    expect(result.paletteProvider?.getSnapshot().colors).toHaveLength(221);
    expect(result.generationRuntime.availability.available).toBe(false);
    expect(result.generationRuntime.service).toBeUndefined();
  });

  it("maps a known Provider failure to a safe palette failure result", () => {
    const original = new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_COLOR_INVALID",
      { field: "hex", recordIndex: 12 },
    );
    const result = createApplicationRuntimeBootstrap({
      createPaletteProvider: () => {
        throw original;
      },
    });

    expect(result).toEqual({
      status: "palette-unavailable",
      paletteProvider: null,
      generationRuntime: {
        availability: {
          available: false,
          reason: "production-runtime-unavailable",
        },
      },
      errorCode: "APPLICATION_RUNTIME_PALETTE_INVALID",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /hex|recordIndex|runtime-palette|zod|stack|sha-?256|data-source/i,
    );
  });

  it.each([
    new Error("sensitive internal startup detail"),
    "unexpected thrown value",
  ])(
    "fails closed for an unexpected failure without rethrowing %j",
    (failure) => {
      const result = createApplicationRuntimeBootstrap({
        createPaletteProvider: () => {
          throw failure;
        },
      });
      expect(result).toMatchObject({
        status: "palette-unavailable",
        paletteProvider: null,
        errorCode: "APPLICATION_RUNTIME_INITIALIZATION_FAILED",
        generationRuntime: { availability: { available: false } },
      });
      expect(JSON.stringify(result)).not.toContain(String(failure));
    },
  );

  it("does not return a partial Provider when its factory fails", () => {
    const partialProvider = createApprovedRuntimePaletteProvider();
    const result = createApplicationRuntimeBootstrap({
      createPaletteProvider: () => {
        void partialProvider;
        throw new Error("after allocation");
      },
    });
    expect(result.status).toBe("palette-unavailable");
    expect(result.paletteProvider).toBeNull();
  });

  it("completes bootstrap before render and injects its explicit Runtime", () => {
    const events: string[] = [];
    const expected = createApplicationRuntimeBootstrap({
      createPaletteProvider: createApprovedRuntimePaletteProvider,
    });
    const bootstrap = vi.fn(() => {
      events.push("bootstrap");
      return expected;
    });
    const render = vi.fn((runtime) => {
      events.push("render");
      expect(runtime).toBe(expected.generationRuntime);
    });

    const result = startApplication({ bootstrap, render });

    expect(result).toBe(expected);
    expect(events).toEqual(["bootstrap", "render"]);
    expect(bootstrap).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledOnce();
  });
});
