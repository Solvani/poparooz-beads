import { describe, expect, it } from "vitest";

import { recommendBoardSetup } from "./board-recommendation";

describe("recommendBoardSetup", () => {
  it.each([
    [40, 52, null],
    [60, 78, 4],
    [80, 104, 4],
    [104, 104, 4],
  ] as const)(
    "recommends the smallest approved single board for %s by %s",
    (size, boardSize, alternativeCount) => {
      const result = recommendBoardSetup({ width: size, height: size });

      expect(result?.primary.beadWidth).toBe(boardSize);
      expect(result?.primary.beadHeight).toBe(boardSize);
      expect(result?.modularAlternative?.boardCount ?? null).toBe(
        alternativeCount,
      );
    },
  );

  it("keeps the approved physical dimensions and modular coverage explicit", () => {
    const result = recommendBoardSetup({ width: 60, height: 40 });

    expect(result?.primary).toMatchObject({
      beadWidth: 78,
      physicalWidthCm: 21,
      assembly: "standalone",
    });
    expect(result?.modularAlternative).toMatchObject({
      columns: 2,
      rows: 1,
      boardCount: 2,
      coverageWidth: 104,
      coverageHeight: 52,
    });
  });

  it("fails safely outside the approved single-board boundary", () => {
    expect(recommendBoardSetup({ width: 105, height: 104 })).toBeNull();
    expect(recommendBoardSetup({ width: 0, height: 40 })).toBeNull();
  });
});
