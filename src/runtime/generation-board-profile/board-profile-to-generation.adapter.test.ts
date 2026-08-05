import { describe, expect, it } from "vitest";

import { createApprovedBoardProfileProvider } from "../board-profile/approved-board-profile";
import type { ApprovedBoardProfileSnapshot } from "../board-profile/board-profile.types";
import { adaptBoardProfileToGeneration } from "./board-profile-to-generation.adapter";
import { GenerationBoardProfileError } from "./generation-board-profile.errors";

describe("BoardProfile-to-Generation Adapter", () => {
  it("projects the exact generation whitelist", () => {
    const result = adaptBoardProfileToGeneration(
      createApprovedBoardProfileProvider().getSnapshot(),
    );
    expect(result).toEqual({
      id: "poparooz-board-104",
      version: "1.0.0",
      shape: "square",
      pegGrid: { columns: 104, rows: 104 },
      tiling: { supported: true, sharedEdgePegs: false },
    });
    expect(Object.keys(result)).toEqual([
      "id",
      "version",
      "shape",
      "pegGrid",
      "tiling",
    ]);
    expect(Object.keys(result.pegGrid)).toEqual(["columns", "rows"]);
    expect(Object.keys(result.tiling)).toEqual(["supported", "sharedEdgePegs"]);
  });

  it("omits approval, physical, seam, pitch, and candidate fields", () => {
    const result = adaptBoardProfileToGeneration(
      createApprovedBoardProfileProvider().getSnapshot(),
    );
    for (const forbidden of [
      "status",
      "name",
      "beadSizeMm",
      "isDefault",
      "isActive",
      "outerDimensionsMm",
      "firstToLastPegCenterSpanMm",
      "internalPegIntervalCount",
      "seamAdjacentPegCenterDistanceMm",
      "seamType",
      "pegPitchMm",
      "candidateProfiles",
    ]) {
      expect(JSON.stringify(result)).not.toContain(forbidden);
    }
  });

  it("is deterministic, mutation-isolated, and deeply frozen", () => {
    const approved = createApprovedBoardProfileProvider().getSnapshot();
    const first = adaptBoardProfileToGeneration(approved);
    const second = adaptBoardProfileToGeneration(approved);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.pegGrid)).toBe(true);
    expect(Object.isFrozen(first.tiling)).toBe(true);
    expect(Reflect.set(first.pegGrid, "columns", 1)).toBe(false);
    expect(second.pegGrid.columns).toBe(104);
  });

  it.each([
    ["identity", "id", "other"],
    ["version", "version", "2.0.0"],
    ["missing identity", "id", undefined],
  ])("fails closed for invalid %s", (_label, field, value) => {
    const candidate = structuredClone(
      createApprovedBoardProfileProvider().getSnapshot(),
    );
    if (value === undefined) Reflect.deleteProperty(candidate, field);
    else Reflect.set(candidate, field, value);
    expect(() =>
      adaptBoardProfileToGeneration(
        candidate as unknown as ApprovedBoardProfileSnapshot,
      ),
    ).toThrow(GenerationBoardProfileError);
  });
});
