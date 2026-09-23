import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";

export const PATTERN_DOCUMENT_EMPTY_CELL = 65_535;
export const PATTERN_EDITOR_HISTORY_LIMIT = 100;

export type PatternEditorErrorCode =
  | "INVALID_GENERATED_RESULT"
  | "UNRESOLVABLE_PALETTE_COLOR"
  | "INVALID_PATTERN_DOCUMENT"
  | "INCOMPATIBLE_PATTERN_DOCUMENT"
  | "EMPTY_PATTERN_RESULT_UNSUPPORTED";

export class PatternEditorError extends Error {
  readonly code: PatternEditorErrorCode;

  constructor(code: PatternEditorErrorCode, message: string) {
    super(message);
    this.name = "PatternEditorError";
    this.code = code;
  }
}

export interface PatternDocumentPaletteIdentity {
  readonly paletteId: "poparooz-standard";
  readonly paletteVersion: "1.0.0";
}

export interface PatternDocumentBoardProfileIdentity {
  readonly id: "poparooz-board-104";
  readonly version: "1.0.0";
}

export interface PatternDocument {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint16Array;
  readonly palette: PatternDocumentPaletteIdentity;
  readonly boardProfile: PatternDocumentBoardProfileIdentity;
}

export interface PatternEditorHistory {
  readonly past: readonly PatternDocument[];
  readonly present: PatternDocument;
  readonly future: readonly PatternDocument[];
}

export interface PatternEditorSession {
  readonly sourceResult: PublicPatternResult;
  readonly baseline: PatternDocument;
  readonly history: PatternEditorHistory;
  readonly revision: number;
}

export type PatternEditorAction =
  | { readonly type: "commit"; readonly document: PatternDocument }
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "reset" };
