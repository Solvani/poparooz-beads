import { useMemo } from "react";

import type { ImageBackground } from "../../domain/image";
import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { ColorList } from "./ColorList";
import { PatternSummary } from "./PatternSummary";
import { ResultRecommendations } from "./ResultRecommendations";
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
  readonly selectedColorSetLabel: string;
  readonly patternBackground: ImageBackground;
  readonly focusedColorIndex: number | null;
  readonly onFocusColor: (colorIndex: number) => void;
  readonly onClearHighlight: () => void;
}

export function PatternResults({
  pattern,
  status,
  selectedColorSetLabel,
  patternBackground,
  focusedColorIndex,
  onFocusColor,
  onClearHighlight,
}: PatternResultsProps) {
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
      <PatternSummary
        summary={result.view.summary}
        selectedColorSetLabel={selectedColorSetLabel}
        patternBackground={patternBackground}
      />
      <ResultRecommendations
        summary={result.view.summary}
        colors={result.view.colors}
      />
      <ColorList
        colors={result.view.colors}
        focusedColorIndex={focusedColorIndex}
        onFocusColor={onFocusColor}
        onClearHighlight={onClearHighlight}
      />
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
