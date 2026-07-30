import { useMemo } from "react";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { BoardLayoutSummary } from "./BoardLayoutSummary";
import { ColorList } from "./ColorList";
import { PatternSummary } from "./PatternSummary";
import { toPatternResultView } from "./pattern-result-view";

export type ResultLifecycleStatus =
  | "idle"
  | "image-loaded"
  | "processing"
  | "success"
  | "dirty"
  | "regenerating"
  | "aborted"
  | "error";

export interface PatternResultsProps {
  readonly pattern: PublicPatternResult;
  readonly status: ResultLifecycleStatus;
}

export function PatternResults({ pattern, status }: PatternResultsProps) {
  const result = useMemo(() => toPatternResultView(pattern), [pattern]);
  if (!result.ok) {
    return (
      <p className="result-view-error" role="status">
        We couldn’t display these pattern details.
      </p>
    );
  }
  return (
    <div className="pattern-results">
      <ResultRetentionStatus status={status} />
      <PatternSummary summary={result.view.summary} />
      <ColorList colors={result.view.colors} />
      <BoardLayoutSummary layout={result.view.boardLayout} />
    </div>
  );
}

export function ResultRetentionStatus({
  status,
}: {
  readonly status: ResultLifecycleStatus;
}) {
  const message =
    status === "dirty"
      ? "These details belong to your previous pattern."
      : status === "regenerating"
        ? "Previous pattern details remain visible until the update is ready."
        : status === "aborted"
          ? "Pattern update stopped. These previous pattern details remain available."
          : status === "error"
            ? "Pattern update failed. These previous pattern details remain available."
            : null;
  return message ? (
    <p className="result-retention-status" role="status">
      {message}
    </p>
  ) : null;
}
