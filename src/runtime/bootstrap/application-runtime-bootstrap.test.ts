// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { RuntimePaletteBrowserError } from "../palette/runtime-palette.errors";
import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import { createApprovedBoardProfileProvider } from "../board-profile/approved-board-profile";
import { BoardProfileBrowserError } from "../board-profile/board-profile.errors";
import { adaptBoardProfileToGeneration } from "../generation-board-profile/board-profile-to-generation.adapter";
import { GenerationBoardProfileError } from "../generation-board-profile/generation-board-profile.errors";
import { adaptRuntimePaletteToGeneration } from "../generation-palette/runtime-to-generation-palette.adapter";
import {
  bootstrapApprovedApplicationRuntime,
  createApplicationRuntimeBootstrap,
} from "./application-runtime-bootstrap";
import { startApplication } from "./application-startup";
import type { ApplicationRuntimeBootstrapDependencies } from "./application-runtime-bootstrap.types";

function approvedDependencies(
  overrides: Partial<ApplicationRuntimeBootstrapDependencies> = {},
): ApplicationRuntimeBootstrapDependencies {
  return {
    createPaletteProvider: createApprovedRuntimePaletteProvider,
    adaptPalette: adaptRuntimePaletteToGeneration,
    createBoardProfileProvider: createApprovedBoardProfileProvider,
    adaptBoardProfile: adaptBoardProfileToGeneration,
    ...overrides,
  };
}

describe("Application Runtime Bootstrap", () => {
  it("creates one approved Provider while keeping GenerationRuntime unavailable", () => {
    const provider = createApprovedRuntimePaletteProvider();
    const createPaletteProvider = vi.fn(() => provider);

    const createBoardProfileProvider = vi.fn(
      createApprovedBoardProfileProvider,
    );
    const result = createApplicationRuntimeBootstrap(
      approvedDependencies({
        createPaletteProvider,
        createBoardProfileProvider,
      }),
    );

    expect(createPaletteProvider).toHaveBeenCalledOnce();
    expect(createBoardProfileProvider).toHaveBeenCalledOnce();
    expect(result.status).toBe("dependencies-ready");
    if (result.status !== "dependencies-ready")
      throw new Error("Unexpected status");
    expect(result.paletteProvider).toBe(provider);
    expect(result.paletteProvider.getSnapshot()).toMatchObject({
      paletteId: "poparooz-standard",
      paletteVersion: "1.0.0",
      artifactVersion: "1.0.0",
      recordCount: 221,
      activeCount: 221,
      autoMatchEligibleCount: 221,
    });
    expect(result.generationPalette.colors).toHaveLength(221);
    expect(result.boardProfileProvider.getSnapshot()).toMatchObject({
      id: "poparooz-board-104",
      version: "1.0.0",
      pegGrid: { columns: 104, rows: 104 },
    });
    expect(result.generationBoardProfile).toEqual({
      id: "poparooz-board-104",
      version: "1.0.0",
      shape: "square",
      pegGrid: { columns: 104, rows: 104 },
      tiling: { supported: true, sharedEdgePegs: false },
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
    expect(result.status).toBe("dependencies-ready");
    expect(result.paletteProvider).not.toBeNull();
    expect(result.paletteProvider?.getSnapshot().colors).toHaveLength(221);
    expect(result.boardProfileProvider?.getSnapshot().id).toBe(
      "poparooz-board-104",
    );
    expect(result.generationRuntime.availability.available).toBe(false);
    expect(result.generationRuntime.service).toBeUndefined();
  });

  it("maps a known Provider failure to a safe palette failure result", () => {
    const original = new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_COLOR_INVALID",
      { field: "hex", recordIndex: 12 },
    );
    const result = createApplicationRuntimeBootstrap(
      approvedDependencies({
        createPaletteProvider: () => {
          throw original;
        },
      }),
    );

    expect(result).toEqual({
      status: "palette-unavailable",
      paletteProvider: null,
      generationPalette: null,
      boardProfileProvider: null,
      generationBoardProfile: null,
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
      const result = createApplicationRuntimeBootstrap(
        approvedDependencies({
          createPaletteProvider: () => {
            throw failure;
          },
        }),
      );
      expect(result).toMatchObject({
        status: "palette-unavailable",
        paletteProvider: null,
        generationPalette: null,
        boardProfileProvider: null,
        generationBoardProfile: null,
        errorCode: "APPLICATION_RUNTIME_INITIALIZATION_FAILED",
        generationRuntime: { availability: { available: false } },
      });
      expect(JSON.stringify(result)).not.toContain(String(failure));
    },
  );

  it("does not return a partial Provider when its factory fails", () => {
    const partialProvider = createApprovedRuntimePaletteProvider();
    const result = createApplicationRuntimeBootstrap(
      approvedDependencies({
        createPaletteProvider: () => {
          void partialProvider;
          throw new Error("after allocation");
        },
      }),
    );
    expect(result.status).toBe("palette-unavailable");
    expect(result.paletteProvider).toBeNull();
  });

  it("completes bootstrap before render and injects its explicit Runtime", () => {
    const events: string[] = [];
    const expected = createApplicationRuntimeBootstrap(approvedDependencies());
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

  it("creates Palette then Board dependencies synchronously before render", () => {
    const events: string[] = [];
    const result = createApplicationRuntimeBootstrap(
      approvedDependencies({
        createPaletteProvider: () => {
          events.push("palette-provider");
          return createApprovedRuntimePaletteProvider();
        },
        adaptPalette: (snapshot) => {
          events.push("palette-adapter");
          return adaptRuntimePaletteToGeneration(snapshot);
        },
        createBoardProfileProvider: () => {
          events.push("board-provider");
          return createApprovedBoardProfileProvider();
        },
        adaptBoardProfile: (snapshot) => {
          events.push("board-adapter");
          return adaptBoardProfileToGeneration(snapshot);
        },
      }),
    );
    expect(result.status).toBe("dependencies-ready");
    expect(events).toEqual([
      "palette-provider",
      "palette-adapter",
      "board-provider",
      "board-adapter",
    ]);
    expect(result.generationRuntime.availability).toEqual({
      available: false,
      reason: "production-runtime-unavailable",
    });
  });

  it("fails closed on BoardProfile failure without returning partial dependencies", () => {
    const result = createApplicationRuntimeBootstrap(
      approvedDependencies({
        createBoardProfileProvider: () => {
          throw new BoardProfileBrowserError("BOARD_PROFILE_VALUE_MISMATCH");
        },
      }),
    );
    expect(result).toEqual({
      status: "board-profile-unavailable",
      paletteProvider: null,
      generationPalette: null,
      boardProfileProvider: null,
      generationBoardProfile: null,
      generationRuntime: {
        availability: {
          available: false,
          reason: "board-profile-unavailable",
        },
      },
      errorCode: "APPLICATION_BOARD_PROFILE_INVALID",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /zod|stack|artifact|evidence|poparooz-board-104/i,
    );
  });

  it("maps a known BoardProfile Adapter failure without partial dependencies", () => {
    const result = createApplicationRuntimeBootstrap(
      approvedDependencies({
        adaptBoardProfile: () => {
          throw new GenerationBoardProfileError(
            "GENERATION_BOARD_PROFILE_OUTPUT_INVALID",
          );
        },
      }),
    );
    expect(result).toEqual({
      status: "board-profile-unavailable",
      paletteProvider: null,
      generationPalette: null,
      boardProfileProvider: null,
      generationBoardProfile: null,
      generationRuntime: {
        availability: {
          available: false,
          reason: "board-profile-unavailable",
        },
      },
      errorCode: "APPLICATION_BOARD_PROFILE_INVALID",
    });
    expect(JSON.stringify(result)).not.toMatch(/zod|stack|artifact|evidence/i);
  });

  it("maps an unknown BoardProfile Adapter failure to safe initialization failure", () => {
    const result = createApplicationRuntimeBootstrap(
      approvedDependencies({
        adaptBoardProfile: () => {
          throw new Error("sensitive internal board adapter failure");
        },
      }),
    );
    expect(result).toEqual({
      status: "board-profile-unavailable",
      paletteProvider: null,
      generationPalette: null,
      boardProfileProvider: null,
      generationBoardProfile: null,
      generationRuntime: {
        availability: {
          available: false,
          reason: "board-profile-unavailable",
        },
      },
      errorCode: "APPLICATION_RUNTIME_INITIALIZATION_FAILED",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /sensitive internal board adapter failure|stack/i,
    );
  });
});
