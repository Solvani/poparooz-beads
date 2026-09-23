import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { isPatternEditorDirty } from "./pattern-editor-reducer";
import {
  PATTERN_DOCUMENT_EMPTY_CELL,
  type PatternEditorSession,
} from "./pattern-editor.types";
import {
  projectEmptyPatternDocument,
  projectPatternDocument,
  type EmptyPatternDocumentProjection,
} from "./pattern-result-projection";

export type PatternEditorCustomerResult =
  | {
      readonly kind: "original";
      readonly edited: false;
      readonly pattern: PublicPatternResult;
    }
  | {
      readonly kind: "edited";
      readonly edited: true;
      readonly pattern: PublicPatternResult;
    }
  | {
      readonly kind: "empty-edited";
      readonly edited: true;
      readonly empty: EmptyPatternDocumentProjection;
    };

export function derivePatternEditorCustomerResult(
  session: PatternEditorSession,
): PatternEditorCustomerResult {
  if (!isPatternEditorDirty(session)) {
    return Object.freeze({
      kind: "original",
      edited: false,
      pattern: session.sourceResult,
    });
  }
  const document = session.history.present;
  const empty = document.cells.every(
    (cell) => cell === PATTERN_DOCUMENT_EMPTY_CELL,
  );
  return empty
    ? Object.freeze({
        kind: "empty-edited",
        edited: true,
        empty: projectEmptyPatternDocument(document),
      })
    : Object.freeze({
        kind: "edited",
        edited: true,
        pattern: projectPatternDocument(document),
      });
}
