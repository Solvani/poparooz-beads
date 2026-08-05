import { describe, expect, it, vi } from "vitest";

import { createApprovedBoardProfileProvider } from "./approved-board-profile";
import { BoardProfileBrowserError } from "./board-profile.errors";
import { createApprovedBoardProfileProviderFromArtifact } from "./board-profile.provider";
import { parseApprovedBoardProfileArtifact } from "./board-profile.schema";

describe("Approved BoardProfile Provider", () => {
  it("loads the sole approved v1 Artifact with every frozen value", () => {
    const provider = createApprovedBoardProfileProvider();
    expect(provider.getSnapshot()).toMatchObject({
      id: "poparooz-board-104",
      version: "1.0.0",
      status: "approved",
      shape: "square",
      pegGrid: { columns: 104, rows: 104 },
      outerDimensionsMm: { width: 280, height: 280, thickness: 2 },
      firstToLastPegCenterSpanMm: 278,
      internalPegIntervalCount: 103,
      tiling: {
        supported: true,
        sharedEdgePegs: false,
        seamAdjacentPegCenterDistanceMm: 2.3,
        seamType: "non-uniform",
      },
    });
    expect(Object.keys(provider)).toEqual(["getSnapshot"]);
  });

  it("defensively copies and deeply freezes the approved Snapshot", () => {
    const input = validArtifactInput();
    const provider = createApprovedBoardProfileProviderFromArtifact(input);
    const first = provider.getSnapshot();

    Reflect.set(input, "id", "changed");
    Reflect.set(input.pegGrid, "columns", 1);
    Reflect.set(input.tiling, "supported", false);

    expect(first).toEqual(validArtifactInput());
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.pegGrid)).toBe(true);
    expect(Object.isFrozen(first.outerDimensionsMm)).toBe(true);
    expect(Object.isFrozen(first.tiling)).toBe(true);
    expect(Reflect.set(first, "id", "changed")).toBe(false);
    expect(Reflect.set(first.pegGrid, "columns", 1)).toBe(false);
    expect(provider.getSnapshot()).toBe(first);
    expect(provider.getSnapshot()).toEqual(validArtifactInput());
  });

  it.each([
    ["unknown ID", (value: object) => Reflect.set(value, "id", "other")],
    [
      "unsupported version",
      (value: object) => Reflect.set(value, "version", "2.0.0"),
    ],
    [
      "candidate 78 x 78",
      (value: ReturnType<typeof validArtifactInput>) => {
        Reflect.set(value.pegGrid, "columns", 78);
        Reflect.set(value.pegGrid, "rows", 78);
      },
    ],
    [
      "candidate 52 x 52",
      (value: ReturnType<typeof validArtifactInput>) => {
        Reflect.set(value.pegGrid, "columns", 52);
        Reflect.set(value.pegGrid, "rows", 52);
      },
    ],
    [
      "missing field",
      (value: object) => Reflect.deleteProperty(value, "status"),
    ],
    ["extra field", (value: object) => Reflect.set(value, "extra", true)],
    ["name", (value: object) => Reflect.set(value, "name", "Board")],
    ["beadSizeMm", (value: object) => Reflect.set(value, "beadSizeMm", 2.7)],
    ["pegPitchMm", (value: object) => Reflect.set(value, "pegPitchMm", 2.7)],
  ])("rejects %s without fallback", (_label, mutate) => {
    const candidate = validArtifactInput();
    mutate(candidate);
    expect(() => parseApprovedBoardProfileArtifact(candidate)).toThrow(
      BoardProfileBrowserError,
    );
    expect(() =>
      createApprovedBoardProfileProviderFromArtifact(candidate),
    ).toThrow(BoardProfileBrowserError);
  });

  it("fails closed without warning or fallback output", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let provider:
      | ReturnType<typeof createApprovedBoardProfileProviderFromArtifact>
      | undefined;
    let failure: unknown;
    try {
      provider = createApprovedBoardProfileProviderFromArtifact({});
    } catch (error) {
      failure = error;
    }
    expect(provider).toBeUndefined();
    expect(failure).toBeInstanceOf(BoardProfileBrowserError);
    expect(String(failure)).not.toMatch(/zod|stack|[A-Za-z]:[\\/]|artifact/i);
    expect(warn).not.toHaveBeenCalled();
  });
});

function validArtifactInput() {
  return {
    id: "poparooz-board-104",
    version: "1.0.0",
    status: "approved",
    shape: "square",
    pegGrid: { columns: 104, rows: 104 },
    outerDimensionsMm: { width: 280, height: 280, thickness: 2 },
    firstToLastPegCenterSpanMm: 278,
    internalPegIntervalCount: 103,
    tiling: {
      supported: true,
      sharedEdgePegs: false,
      seamAdjacentPegCenterDistanceMm: 2.3,
      seamType: "non-uniform",
    },
  };
}
