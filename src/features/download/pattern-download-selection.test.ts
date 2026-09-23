import { describe, expect, it } from "vitest";

import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import {
  EMPTY_EDITED_PATTERN_DOWNLOAD_MESSAGE,
  selectPatternDownload,
} from "./pattern-download-selection";

const original = createPublicPattern();

describe("pattern download selection", () => {
  it("selects the exact original result when the editor is unchanged", () => {
    const selected = selectPatternDownload({
      generationIdentity: 7,
      originalPattern: original,
      customerResult: {
        kind: "original",
        edited: false,
        pattern: original,
      },
      selectedColorSetLabel: "72-Color Set",
    });

    expect(selected.kind).toBe("ready");
    if (selected.kind !== "ready") throw new Error("Expected ready selection");
    expect(selected.source).toBe("original");
    expect(selected.input.pattern).toBe(original);
  });

  it("selects edited content and changes identity with exact payload content", () => {
    const edited = Object.freeze({
      ...original,
      matrix: Object.freeze({
        ...original.matrix,
        colorIndices: new Uint16Array([1, 1, 1, 0]),
      }),
    });
    const first = selectPatternDownload({
      generationIdentity: 7,
      originalPattern: original,
      customerResult: { kind: "edited", edited: true, pattern: edited },
      selectedColorSetLabel: "72-Color Set",
    });
    const equivalent = selectPatternDownload({
      generationIdentity: 7,
      originalPattern: original,
      customerResult: {
        kind: "edited",
        edited: true,
        pattern: Object.freeze({
          ...edited,
          matrix: Object.freeze({
            ...edited.matrix,
            colorIndices: edited.matrix.colorIndices.slice(),
          }),
        }),
      },
      selectedColorSetLabel: "72-Color Set",
    });
    const changed = selectPatternDownload({
      generationIdentity: 7,
      originalPattern: original,
      customerResult: {
        kind: "edited",
        edited: true,
        pattern: Object.freeze({
          ...edited,
          matrix: Object.freeze({
            ...edited.matrix,
            colorIndices: new Uint16Array([0, 1, 1, 0]),
          }),
        }),
      },
      selectedColorSetLabel: "72-Color Set",
    });

    expect(first.kind).toBe("ready");
    if (
      first.kind !== "ready" ||
      equivalent.kind !== "ready" ||
      changed.kind !== "ready"
    ) {
      throw new Error("Expected ready selections");
    }
    expect(first.source).toBe("edited");
    expect(first.input.pattern).toBe(edited);
    expect(equivalent.identity).toBe(first.identity);
    expect(changed.identity).not.toBe(first.identity);
  });

  it("binds identity to generation, source kind, and selected set label", () => {
    const base = selectPatternDownload({
      generationIdentity: 7,
      originalPattern: original,
      customerResult: null,
      selectedColorSetLabel: "72-Color Set",
    });
    const nextGeneration = selectPatternDownload({
      generationIdentity: 8,
      originalPattern: original,
      customerResult: null,
      selectedColorSetLabel: "72-Color Set",
    });
    const nextLabel = selectPatternDownload({
      generationIdentity: 7,
      originalPattern: original,
      customerResult: null,
      selectedColorSetLabel: "120-Color Set",
    });
    const edited = selectPatternDownload({
      generationIdentity: 7,
      originalPattern: original,
      customerResult: { kind: "edited", edited: true, pattern: original },
      selectedColorSetLabel: "72-Color Set",
    });

    expect(nextGeneration.identity).not.toBe(base.identity);
    expect(nextLabel.identity).not.toBe(base.identity);
    expect(edited.identity).not.toBe(base.identity);
  });

  it("makes an empty edited document unavailable without an original fallback", () => {
    const selected = selectPatternDownload({
      generationIdentity: 7,
      originalPattern: original,
      customerResult: {
        kind: "empty-edited",
        edited: true,
        empty: {
          kind: "empty-edited-pattern",
          width: 2,
          height: 2,
          totalPositions: 4,
          totalBeads: 0,
          transparentPositions: 4,
          colorCount: 0,
          colors: [],
          materials: [],
          boardLayout: original.boardLayout,
        },
      },
      selectedColorSetLabel: "72-Color Set",
    });

    expect(selected).toMatchObject({
      kind: "unavailable",
      source: "empty-edited",
      message: EMPTY_EDITED_PATTERN_DOWNLOAD_MESSAGE,
    });
    expect("input" in selected).toBe(false);
  });
});
