import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import {
  copyPatternDocument,
  createPatternDocument,
  patternDocumentsEqual,
  validatePatternDocument,
} from "./pattern-document";
import {
  PATTERN_EDITOR_HISTORY_LIMIT,
  PatternEditorError,
  type PatternDocument,
  type PatternEditorAction,
  type PatternEditorSession,
} from "./pattern-editor.types";

export function createPatternEditorSession(
  sourceResult: PublicPatternResult,
): PatternEditorSession {
  const generated = createPatternDocument(sourceResult);
  return Object.freeze({
    sourceResult,
    baseline: copyPatternDocument(generated),
    history: Object.freeze({
      past: Object.freeze([]),
      present: copyPatternDocument(generated),
      future: Object.freeze([]),
    }),
    revision: 0,
  });
}

export function reducePatternEditorSession(
  session: PatternEditorSession,
  action: PatternEditorAction,
): PatternEditorSession {
  switch (action.type) {
    case "commit":
      return commitDocument(session, action.document);
    case "undo":
      return undo(session);
    case "redo":
      return redo(session);
    case "reset":
      return commitDocument(session, session.baseline);
  }
}

export function isPatternEditorDirty(session: PatternEditorSession): boolean {
  return !patternDocumentsEqual(session.history.present, session.baseline);
}

function commitDocument(
  session: PatternEditorSession,
  candidate: PatternDocument,
): PatternEditorSession {
  validateCompatibleDocument(session.baseline, candidate);
  if (patternDocumentsEqual(session.history.present, candidate)) return session;

  const past = [
    ...session.history.past,
    copyPatternDocument(session.history.present),
  ].slice(-PATTERN_EDITOR_HISTORY_LIMIT);
  return withHistory(session, past, copyPatternDocument(candidate), []);
}

function undo(session: PatternEditorSession): PatternEditorSession {
  if (session.history.past.length === 0) return session;
  const previous = session.history.past.at(-1)!;
  return withHistory(
    session,
    session.history.past.slice(0, -1),
    copyPatternDocument(previous),
    [copyPatternDocument(session.history.present), ...session.history.future],
  );
}

function redo(session: PatternEditorSession): PatternEditorSession {
  const next = session.history.future[0];
  if (next === undefined) return session;
  const past = [
    ...session.history.past,
    copyPatternDocument(session.history.present),
  ].slice(-PATTERN_EDITOR_HISTORY_LIMIT);
  return withHistory(
    session,
    past,
    copyPatternDocument(next),
    session.history.future.slice(1),
  );
}

function withHistory(
  session: PatternEditorSession,
  past: readonly PatternDocument[],
  present: PatternDocument,
  future: readonly PatternDocument[],
): PatternEditorSession {
  return Object.freeze({
    sourceResult: session.sourceResult,
    baseline: session.baseline,
    history: Object.freeze({
      past: Object.freeze(past),
      present,
      future: Object.freeze(future),
    }),
    revision: session.revision + 1,
  });
}

function validateCompatibleDocument(
  baseline: PatternDocument,
  candidate: PatternDocument,
): void {
  validatePatternDocument(candidate);
  if (
    baseline.width !== candidate.width ||
    baseline.height !== candidate.height ||
    baseline.palette.paletteId !== candidate.palette.paletteId ||
    baseline.palette.paletteVersion !== candidate.palette.paletteVersion ||
    baseline.boardProfile.id !== candidate.boardProfile.id ||
    baseline.boardProfile.version !== candidate.boardProfile.version
  ) {
    throw new PatternEditorError(
      "INCOMPATIBLE_PATTERN_DOCUMENT",
      "A committed document must retain the editor session dimensions and authorities.",
    );
  }
}
