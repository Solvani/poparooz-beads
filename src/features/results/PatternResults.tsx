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
    <PatternResultDetails
      view={result.view}
      status={status}
      selectedColorSetLabel={selectedColorSetLabel}
      patternBackground={patternBackground}
      focusedColorIndex={focusedColorIndex}
      onFocusColor={onFocusColor}
      onClearHighlight={onClearHighlight}
    />
  );
}

export function PatternResultDetails({
  view,
  status,
  selectedColorSetLabel,
  patternBackground,
  focusedColorIndex,
  onFocusColor,
  onClearHighlight,
  edited = false,
}: Omit<PatternResultsProps, "pattern"> & {
  readonly view: import("./result.types").PatternResultView;
  readonly edited?: boolean;
}) {
  return (
    <div className="pattern-results">
      <ResultRetentionStatus status={status} />
      {edited ? (
        <p className="result-retention-status" role="status">
          Results updated from your local pattern edits.
        </p>
      ) : null}
      <PatternSummary
        summary={view.summary}
        selectedColorSetLabel={selectedColorSetLabel}
        patternBackground={patternBackground}
      />
      <ResultRecommendations summary={view.summary} colors={view.colors} />
      <ColorList
        colors={view.colors}
        materials={view.materials}
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
