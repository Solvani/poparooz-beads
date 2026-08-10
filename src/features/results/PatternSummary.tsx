import type { PatternSummaryView } from "./result.types";

export function PatternSummary({
  summary,
  selectedColorSetLabel,
  variant = "full",
}: {
  readonly summary: PatternSummaryView;
  readonly selectedColorSetLabel: string;
  readonly variant?: "full" | "compact";
}) {
  return (
    <section
      className="result-section pattern-summary"
      aria-labelledby="pattern-summary-heading"
    >
      <h3 id="pattern-summary-heading">Pattern Summary</h3>
      <dl className="pattern-summary-list">
        <div>
          <dt>Pattern Size</dt>
          <dd>{summary.patternSize}</dd>
        </div>
        <div>
          <dt>{variant === "compact" ? "Actual Colors" : "Colors"}</dt>
          <dd>{summary.actualColorsLabel}</dd>
        </div>
        <div>
          <dt>Total Beads</dt>
          <dd>{summary.totalBeadsLabel}</dd>
        </div>
        <div>
          <dt>Boards</dt>
          <dd>{summary.boardsLabel}</dd>
        </div>
        <div>
          <dt>Selected Bead Color Set</dt>
          <dd>{selectedColorSetLabel}</dd>
        </div>
      </dl>
      {summary.transparentPositionsLabel ? (
        <p className="result-secondary">{summary.transparentPositionsLabel}</p>
      ) : null}
    </section>
  );
}
