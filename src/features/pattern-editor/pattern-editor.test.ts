import { describe, expect, it } from "vitest";

import { buildPatternBoardLayout } from "../../domain/pattern/board-layout";
import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { createApprovedBoardProfileProvider } from "../../runtime/board-profile/approved-board-profile";
import { adaptBoardProfileToGeneration } from "../../runtime/generation-board-profile/board-profile-to-generation.adapter";
import {
  copyPatternDocument,
  createPatternDocument,
  getPatternEditorPalette,
} from "./pattern-document";
import {
  createPatternEditorSession,
  isPatternEditorDirty,
  reducePatternEditorSession,
} from "./pattern-editor-reducer";
import {
  PATTERN_DOCUMENT_EMPTY_CELL,
  PATTERN_EDITOR_HISTORY_LIMIT,
  PatternEditorError,
  type PatternDocument,
} from "./pattern-editor.types";
import { projectPatternDocument } from "./pattern-result-projection";
import {
  applyDraftCells,
  clientPointToPatternCell,
  interpolatePatternCells,
  strokeValue,
} from "./pattern-editing";
import { createPatternDocumentView } from "./pattern-document-view";
import {
  applyBatchDraft,
  createRectangleDraft,
  createReplaceDraft,
  deriveUsedPatternColors,
  normalizePatternRectangle,
} from "./pattern-batch-operations";

const BOARD = adaptBoardProfileToGeneration(
  createApprovedBoardProfileProvider().getSnapshot(),
);
const PALETTE = getPatternEditorPalette();

describe("A03 palette and batch operations", () => {
  it("derives current used colors and exact counts without a second count store", () => {
    const document = createPatternDocument(
      generatedResult(3, 2, [1, 1, 0, 65_535, 0, 1]),
    );
    expect(deriveUsedPatternColors(document)).toEqual([
      expect.objectContaining({
        code: PALETTE.colors[0]!.code,
        ordinal: 0,
        count: 2,
      }),
      expect.objectContaining({
        code: PALETTE.colors[1]!.code,
        ordinal: 1,
        count: 3,
      }),
    ]);
    document.cells.fill(PATTERN_DOCUMENT_EMPTY_CELL);
    expect(deriveUsedPatternColors(document)).toEqual([]);
  });

  it("previews and applies exact replace-color cells without mutating the source", () => {
    const document = createPatternDocument(
      generatedResult(4, 1, [0, 1, 0, 65_535]),
    );
    const before = document.cells.slice();
    const draft = createReplaceDraft(
      document,
      PALETTE.colors[0]!.code,
      PALETTE.colors[2]!.code,
    );
    expect([...draft.entries()]).toEqual([
      [0, 2],
      [2, 2],
    ]);
    expect(document.cells).toEqual(before);
    expect([...applyBatchDraft(document, draft).cells]).toEqual([
      2, 1, 2, 65_535,
    ]);
    expect(
      createReplaceDraft(
        document,
        PALETTE.colors[0]!.code,
        PALETTE.colors[0]!.code,
      ).size,
    ).toBe(0);
    expect(
      createReplaceDraft(
        document,
        PALETTE.colors[8]!.code,
        PALETTE.colors[0]!.code,
      ).size,
    ).toBe(0);
    expect(
      createReplaceDraft(document, "UNKNOWN", PALETTE.colors[0]!.code).size,
    ).toBe(0);
  });

  it("fills inclusive reversed and single-cell rectangles, including empty cells", () => {
    const document = createPatternDocument(
      generatedResult(3, 2, [0, 1, 0, 65_535, 1, 0]),
    );
    expect(
      normalizePatternRectangle({ column: 2, row: 1 }, { column: 0, row: 0 }),
    ).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
    const reverse = createRectangleDraft(
      document,
      { column: 2, row: 1 },
      { column: 0, row: 0 },
      2,
    );
    expect(reverse.size).toBe(6);
    expect([...applyBatchDraft(document, reverse).cells]).toEqual([
      2, 2, 2, 2, 2, 2,
    ]);
    expect(
      createRectangleDraft(
        document,
        { column: 1, row: 0 },
        { column: 1, row: 0 },
        1,
      ).size,
    ).toBe(0);
    expect(
      createRectangleDraft(
        document,
        { column: 0, row: 1 },
        { column: 0, row: 1 },
        2,
      ).size,
    ).toBe(1);
  });

  it("commits each batch once and preserves exact undo, redo, and redo clearing", () => {
    const initial = createPatternEditorSession(
      generatedResult(3, 1, [0, 1, 0]),
    );
    const replace = applyBatchDraft(
      initial.history.present,
      createReplaceDraft(
        initial.history.present,
        PALETTE.colors[0]!.code,
        PALETTE.colors[2]!.code,
      ),
    );
    const committed = reducePatternEditorSession(initial, {
      type: "commit",
      document: replace,
    });
    expect(committed.history.past).toHaveLength(1);
    const undone = reducePatternEditorSession(committed, { type: "undo" });
    expect(undone.history.present.cells).toEqual(initial.history.present.cells);
    const redone = reducePatternEditorSession(undone, { type: "redo" });
    expect(redone.history.present.cells).toEqual(
      committed.history.present.cells,
    );
    const rectangle = applyBatchDraft(
      undone.history.present,
      createRectangleDraft(
        undone.history.present,
        { column: 0, row: 0 },
        { column: 1, row: 0 },
        3,
      ),
    );
    const replacement = reducePatternEditorSession(undone, {
      type: "commit",
      document: rectangle,
    });
    expect(replacement.history.past).toHaveLength(1);
    expect(replacement.history.future).toEqual([]);
  });
});

describe("direct cell editing primitives", () => {
  it("maps client coordinates through pan and zoom with exclusive outer edges", () => {
    const bounds = { left: 100, top: 50, width: 200, height: 100 };
    const viewport = { scale: 10, offsetX: 20, offsetY: 10 };
    const document = { width: 4, height: 3 };
    expect(
      clientPointToPatternCell(120, 60, bounds, viewport, document),
    ).toEqual({ column: 0, row: 0 });
    expect(
      clientPointToPatternCell(159.9, 89.9, bounds, viewport, document),
    ).toEqual({ column: 3, row: 2 });
    expect(
      clientPointToPatternCell(160, 90, bounds, viewport, document),
    ).toBeNull();
    expect(
      clientPointToPatternCell(300, 60, bounds, viewport, document),
    ).toBeNull();
  });

  it("interpolates fast horizontal, vertical, and diagonal pointer movement", () => {
    expect(
      interpolatePatternCells({ column: 0, row: 1 }, { column: 4, row: 1 }),
    ).toHaveLength(5);
    expect(
      interpolatePatternCells({ column: 2, row: 0 }, { column: 2, row: 4 }),
    ).toHaveLength(5);
    expect(
      interpolatePatternCells({ column: 0, row: 0 }, { column: 4, row: 2 }),
    ).toEqual([
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 2, row: 1 },
      { column: 3, row: 1 },
      { column: 4, row: 2 },
    ]);
  });

  it("keeps a stroke transient and commits all changed cells in one history entry", () => {
    const source = generatedResult(5, 1, [0, 0, 0, 0, 0]);
    const session = createPatternEditorSession(source);
    const draft = new Map<number, number>();
    for (const cell of interpolatePatternCells(
      { column: 0, row: 0 },
      { column: 4, row: 0 },
    )) {
      draft.set(cell.column, strokeValue("eraser", 0));
    }
    expect(session.history.past).toHaveLength(0);
    const candidate = applyDraftCells(session.history.present, draft);
    const committed = reducePatternEditorSession(session, {
      type: "commit",
      document: candidate,
    });
    expect(committed.history.past).toHaveLength(1);
    expect([...committed.history.present.cells]).toEqual([
      65_535, 65_535, 65_535, 65_535, 65_535,
    ]);
    expect(
      createPatternDocumentView(committed.history.present).colors,
    ).toHaveLength(0);
    expect(
      reducePatternEditorSession(committed, { type: "undo" }).history.present
        .cells,
    ).toEqual(session.history.present.cells);
  });

  it("does not mutate the base document when a draft is canceled", () => {
    const base = createPatternDocument(generatedResult(2, 1, [0, 0]));
    const before = base.cells.slice();
    applyDraftCells(base, new Map([[0, PATTERN_DOCUMENT_EMPTY_CELL]]));
    expect(base.cells).toEqual(before);
  });
});

describe("generated result to PatternDocument", () => {
  it("maps dense local indices to versioned stable Poparooz palette ordinals", () => {
    const source = generatedResult(3, 2, [1, 1, 0, 65_535, 0, 1]);
    const document = createPatternDocument(source);

    expect(document).toMatchObject({
      width: 3,
      height: 2,
      palette: { paletteId: "poparooz-standard", paletteVersion: "1.0.0" },
      boardProfile: { id: "poparooz-board-104", version: "1.0.0" },
    });
    expect([...document.cells]).toEqual([1, 1, 0, 65_535, 0, 1]);
    expect(document.cells.buffer).not.toBe(source.matrix.colorIndices.buffer);
  });

  it("owns all editable data independently from the generated result", () => {
    const source = generatedResult(2, 2, [0, 1, 65_535, 0]);
    const original = snapshotResult(source);
    const document = createPatternDocument(source);

    document.cells.fill(1);

    expect(snapshotResult(source)).toEqual(original);
    expect(source.colors[0]!.beadCount).toBe(2);
    expect(source.materials[0]!.beadCount).toBe(2);
    expect(source.totals.transparentPositions).toBe(1);
    expect(source.boardLayout.usedBeadCount).toBe(3);
  });

  it("fails closed for unknown, mismatched, and impossible color references", () => {
    const unknown = generatedResult(1, 1, [0]);
    const invalidCode = {
      ...unknown,
      colors: [
        {
          ...unknown.colors[0]!,
          color: { ...unknown.colors[0]!.color, code: "ZZ99" },
        },
      ],
      materials: [
        {
          ...unknown.materials[0]!,
          color: { ...unknown.materials[0]!.color, code: "ZZ99" },
        },
      ],
    } as PublicPatternResult;
    expectEditorError(
      () => createPatternDocument(invalidCode),
      "UNRESOLVABLE_PALETTE_COLOR",
    );

    const wrongHex = {
      ...unknown,
      colors: [
        {
          ...unknown.colors[0]!,
          color: { ...unknown.colors[0]!.color, hex: "#000000" },
        },
      ],
      materials: [
        {
          ...unknown.materials[0]!,
          color: { ...unknown.materials[0]!.color, hex: "#000000" },
        },
      ],
    } as PublicPatternResult;
    expectEditorError(
      () => createPatternDocument(wrongHex),
      "UNRESOLVABLE_PALETTE_COLOR",
    );

    const impossible = generatedResult(1, 1, [0]);
    impossible.matrix.colorIndices[0] = 4;
    expectEditorError(
      () => createPatternDocument(impossible),
      "INVALID_GENERATED_RESULT",
    );
  });
});

describe("PatternDocument projection", () => {
  it("projects one color with exact counts and independent output storage", () => {
    const source = generatedResult(2, 2, [0, 0, 65_535, 0]);
    const sourceBefore = snapshotResult(source);
    const document = createPatternDocument(source);
    const before = document.cells.slice();
    const projected = projectPatternDocument(document);

    expect(projected.colors).toHaveLength(1);
    expect(projected.materials).toHaveLength(1);
    expect(projected.colors[0]).toMatchObject({ index: 0, beadCount: 3 });
    expect([...projected.matrix.colorIndices]).toEqual([0, 0, 65_535, 0]);
    expect(projected.matrix.colorIndices.buffer).not.toBe(
      document.cells.buffer,
    );
    expect(document.cells).toEqual(before);
    expect(snapshotResult(source)).toEqual(sourceBefore);
  });

  it("densifies multiple colors in authoritative palette order", () => {
    const source = generatedResult(3, 2, [1, 1, 0, 65_535, 0, 1]);
    const document = createPatternDocument(source);
    document.cells.set([5, 1, 5, 65_535, 1, 5]);
    const projected = projectPatternDocument(document);

    expect(projected.colors.map(({ color }) => color.code)).toEqual([
      PALETTE.colors[1]!.code,
      PALETTE.colors[5]!.code,
    ]);
    expect([...projected.matrix.colorIndices]).toEqual([1, 0, 1, 65_535, 0, 1]);
    expect(projected.colors.map(({ beadCount }) => beadCount)).toEqual([2, 3]);
    assertResultInvariants(projected);
  });

  it("is deterministic and does not mutate the document or generated result", () => {
    const source = generatedResult(2, 2, [0, 1, 65_535, 0]);
    const sourceBefore = snapshotResult(source);
    const document = createPatternDocument(source);
    const documentBefore = document.cells.slice();

    const first = projectPatternDocument(document);
    const second = projectPatternDocument(document);

    expect(second).toEqual(first);
    expect(second.matrix.colorIndices).toEqual(first.matrix.colorIndices);
    expect(document.cells).toEqual(documentBefore);
    expect(snapshotResult(source)).toEqual(sourceBefore);
  });

  it("keeps empty cells explicit and rejects a completely empty public projection", () => {
    const document = createPatternDocument(generatedResult(2, 1, [0, 65_535]));
    document.cells.fill(PATTERN_DOCUMENT_EMPTY_CELL);
    expectEditorError(
      () => projectPatternDocument(document),
      "EMPTY_PATTERN_RESULT_UNSUPPORTED",
    );
  });

  it("rejects document cells that do not resolve through the approved palette", () => {
    const document = createPatternDocument(generatedResult(1, 1, [0]));
    document.cells[0] = PALETTE.colors.length;
    expectEditorError(
      () => projectPatternDocument(document),
      "INVALID_PATTERN_DOCUMENT",
    );
  });

  it("projects a practical 104x104 document with exact aggregate invariants", () => {
    const size = 104;
    const indices = new Uint16Array(size * size);
    indices.fill(0);
    for (let position = 0; position < indices.length; position += 7) {
      indices[position] = PATTERN_DOCUMENT_EMPTY_CELL;
    }
    const document = createPatternDocument(
      generatedResult(size, size, indices),
    );
    const projected = projectPatternDocument(document);

    expect(projected.matrix.colorIndices).toHaveLength(10_816);
    expect(projected.boardLayout).toMatchObject({
      boardColumns: 1,
      boardRows: 1,
      boardCount: 1,
      boardWidthInBeads: 104,
      boardHeightInBeads: 104,
    });
    assertResultInvariants(projected);
  });
});

describe("editor session history", () => {
  it("derives dirty from cell equality across commit, undo, reset, and redo", () => {
    const session = createPatternEditorSession(generatedResult(2, 1, [0, 0]));
    const edited = changed(session.history.present, 0, 1);
    const committed = reducePatternEditorSession(session, {
      type: "commit",
      document: edited,
    });
    expect(isPatternEditorDirty(session)).toBe(false);
    expect(isPatternEditorDirty(committed)).toBe(true);

    const undone = reducePatternEditorSession(committed, { type: "undo" });
    expect(isPatternEditorDirty(undone)).toBe(false);
    const redone = reducePatternEditorSession(undone, { type: "redo" });
    expect(isPatternEditorDirty(redone)).toBe(true);

    const reset = reducePatternEditorSession(redone, { type: "reset" });
    expect(isPatternEditorDirty(reset)).toBe(false);
    const undoReset = reducePatternEditorSession(reset, { type: "undo" });
    expect(isPatternEditorDirty(undoReset)).toBe(true);
  });

  it("treats no-op commit and baseline reset as exact no-ops", () => {
    const session = createPatternEditorSession(generatedResult(1, 1, [0]));
    expect(
      reducePatternEditorSession(session, {
        type: "commit",
        document: copyPatternDocument(session.history.present),
      }),
    ).toBe(session);
    expect(reducePatternEditorSession(session, { type: "reset" })).toBe(
      session,
    );
    expect(reducePatternEditorSession(session, { type: "undo" })).toBe(session);
    expect(reducePatternEditorSession(session, { type: "redo" })).toBe(session);
  });

  it("clears redo on a new committed edit", () => {
    const initial = createPatternEditorSession(generatedResult(2, 1, [0, 0]));
    const first = reducePatternEditorSession(initial, {
      type: "commit",
      document: changed(initial.history.present, 0, 1),
    });
    const undone = reducePatternEditorSession(first, { type: "undo" });
    const replacement = reducePatternEditorSession(undone, {
      type: "commit",
      document: changed(undone.history.present, 1, 1),
    });

    expect(replacement.history.future).toEqual([]);
    expect(reducePatternEditorSession(replacement, { type: "redo" })).toBe(
      replacement,
    );
  });

  it("bounds past history to the latest 100 committed states", () => {
    let session = createPatternEditorSession(generatedResult(1, 1, [0]));
    for (let revision = 0; revision < 105; revision += 1) {
      session = reducePatternEditorSession(session, {
        type: "commit",
        document: changed(session.history.present, 0, (revision % 2) + 1),
      });
    }
    expect(session.history.past).toHaveLength(PATTERN_EDITOR_HISTORY_LIMIT);
    expect(session.revision).toBe(105);
  });

  it("copies incoming documents and every moved typed-array snapshot", () => {
    const source = generatedResult(2, 1, [0, 0]);
    const initial = createPatternEditorSession(source);
    const candidate = changed(initial.history.present, 0, 1);
    const committed = reducePatternEditorSession(initial, {
      type: "commit",
      document: candidate,
    });
    candidate.cells[0] = 9;
    expect(committed.history.present.cells[0]).toBe(1);
    expect(committed.history.past[0]!.cells.buffer).not.toBe(
      committed.history.present.cells.buffer,
    );

    const undone = reducePatternEditorSession(committed, { type: "undo" });
    expect(undone.history.present.cells.buffer).not.toBe(
      undone.history.future[0]!.cells.buffer,
    );
    const redone = reducePatternEditorSession(undone, { type: "redo" });
    expect(redone.history.present.cells[0]).toBe(1);
    expect(redone.sourceResult).toBe(source);
    expect(source.matrix.colorIndices).toEqual(new Uint16Array([0, 0]));
  });
});

function generatedResult(
  width: number,
  height: number,
  input: readonly number[] | Uint16Array,
): PublicPatternResult {
  const colorIndices = new Uint16Array(input);
  const maxLocal = colorIndices.reduce(
    (maximum, value) =>
      value === PATTERN_DOCUMENT_EMPTY_CELL
        ? maximum
        : Math.max(maximum, value),
    -1,
  );
  const colors = Object.freeze(
    Array.from({ length: maxLocal + 1 }, (_, index) => {
      const canonical = PALETTE.colors[index]!;
      return Object.freeze({
        index,
        color: Object.freeze({
          brand: "Poparooz" as const,
          code: canonical.code,
          hex: canonical.hex,
        }),
        beadCount: colorIndices.filter((value) => value === index).length,
      });
    }),
  );
  const materials = Object.freeze(
    colors.map((entry) =>
      Object.freeze({
        patternColorIndex: entry.index,
        color: entry.color,
        beadCount: entry.beadCount,
      }),
    ),
  );
  const transparentPositions = colorIndices.filter(
    (value) => value === PATTERN_DOCUMENT_EMPTY_CELL,
  ).length;
  const totals = Object.freeze({
    width,
    height,
    totalPositions: width * height,
    totalBeads: colorIndices.length - transparentPositions,
    transparentPositions,
    colorCount: colors.length,
  });
  const matrix = Object.freeze({
    width,
    height,
    colorIndices,
    transparentIndex: PATTERN_DOCUMENT_EMPTY_CELL,
  });
  const internalLayout = buildPatternBoardLayout(matrix, totals, BOARD);
  const boardLayout = Object.freeze({
    boardColumns: internalLayout.boardColumns,
    boardRows: internalLayout.boardRows,
    boardCount: internalLayout.boardCount,
    boardWidthInBeads: internalLayout.boardWidthInBeads,
    boardHeightInBeads: internalLayout.boardHeightInBeads,
    totalPegCapacity: internalLayout.totalPegCapacity,
    usedBeadCount: internalLayout.usedBeadCount,
    transparentPatternPositions: internalLayout.transparentPatternPositions,
    outsidePatternPegCount: internalLayout.outsidePatternPegCount,
    unusedPegCount: internalLayout.unusedPegCount,
    tiles: internalLayout.tiles,
  });
  return Object.freeze({ matrix, colors, materials, totals, boardLayout });
}

function changed(
  document: PatternDocument,
  position: number,
  paletteOrdinal: number,
): PatternDocument {
  const copy = copyPatternDocument(document);
  copy.cells[position] = paletteOrdinal;
  return copy;
}

function assertResultInvariants(result: PublicPatternResult): void {
  expect(result.colors.reduce((sum, color) => sum + color.beadCount, 0)).toBe(
    result.totals.totalBeads,
  );
  expect(result.totals.totalBeads + result.totals.transparentPositions).toBe(
    result.matrix.width * result.matrix.height,
  );
  expect(result.colors).toHaveLength(result.materials.length);
  expect(result.colors).toHaveLength(result.totals.colorCount);
  result.colors.forEach((color, index) => {
    expect(result.materials[index]).toEqual({
      patternColorIndex: index,
      color: color.color,
      beadCount: color.beadCount,
    });
  });
  result.matrix.colorIndices.forEach((index) => {
    if (index !== PATTERN_DOCUMENT_EMPTY_CELL) {
      expect(result.colors[index]).toBeDefined();
      expect(result.materials[index]).toBeDefined();
    }
  });
}

function snapshotResult(result: PublicPatternResult) {
  return {
    matrix: { ...result.matrix, colorIndices: [...result.matrix.colorIndices] },
    colors: structuredClone(result.colors),
    materials: structuredClone(result.materials),
    totals: structuredClone(result.totals),
    boardLayout: structuredClone(result.boardLayout),
  };
}

function expectEditorError(
  action: () => unknown,
  code: PatternEditorError["code"],
): void {
  try {
    action();
    throw new Error("Expected PatternEditorError");
  } catch (error) {
    expect(error).toBeInstanceOf(PatternEditorError);
    expect((error as PatternEditorError).code).toBe(code);
  }
}
