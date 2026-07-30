import { describe, expect, it } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { MAX_DOM_BOARD_TILES, toBoardLayoutView } from "./board-layout-view";
import { createResultFixture } from "./test/result-fixture";

describe("board layout view", () => {
  it("uses exact public board columns, rows, count, and tiles for small layouts", () => {
    const pattern = createResultFixture({
      width: 4,
      height: 4,
      transparentPositions: 0,
      colors: [{ index: 0, beadCount: 16 }],
      boardColumns: 2,
      boardRows: 2,
    });
    const view = toBoardLayoutView(pattern)!;
    expect(view).toMatchObject({
      boardCountLabel: "4 boards",
      dimensionsLabel: "2 columns × 2 rows",
      previewKind: "tiles",
    });
    expect(view.tiles).toHaveLength(4);
  });

  it("uses singular board copy", () => {
    expect(toBoardLayoutView(createResultFixture())?.boardCountLabel).toBe(
      "1 board",
    );
  });

  it("compresses layouts above 100 boards into no DOM tile view models", () => {
    const pattern = createResultFixture({
      width: 11,
      height: 10,
      transparentPositions: 0,
      colors: [{ index: 0, beadCount: 110 }],
      boardColumns: 11,
      boardRows: 10,
    });
    const view = toBoardLayoutView(pattern)!;
    expect(MAX_DOM_BOARD_TILES).toBe(100);
    expect(view.previewKind).toBe("compressed");
    expect(view.tiles).toHaveLength(0);
    expect(view.accessibilityLabel).toContain("110 boards");
  });

  it.each([
    [
      "count",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        boardLayout: { ...pattern.boardLayout, boardCount: 2 },
      }),
    ],
    [
      "tile count",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        boardLayout: { ...pattern.boardLayout, tiles: [] },
      }),
    ],
    [
      "tile position",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        boardLayout: {
          ...pattern.boardLayout,
          tiles: [{ ...pattern.boardLayout.tiles[0]!, column: 2 }],
        },
      }),
    ],
    [
      "used beads",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        boardLayout: { ...pattern.boardLayout, usedBeadCount: 99 },
      }),
    ],
    [
      "capacity",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        boardLayout: { ...pattern.boardLayout, totalPegCapacity: 99 },
      }),
    ],
  ])("rejects inconsistent public board %s", (_, change) => {
    expect(
      toBoardLayoutView(change(createResultFixture()) as PublicPatternResult),
    ).toBeNull();
  });
});
