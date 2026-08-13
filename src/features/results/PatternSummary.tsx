import type { ImageBackground } from "../../domain/image";
import type { PatternSummaryView } from "./result.types";

const BACKGROUND_LABELS: Readonly<Record<ImageBackground, string>> =
  Object.freeze({
    white: "Full Background",
    transparent: "Remove Background",
  });

export function PatternSummary({
  summary,
  selectedColorSetLabel,
  patternBackground,
}: {
  readonly summary: PatternSummaryView;
  readonly selectedColorSetLabel: string;
  readonly patternBackground: ImageBackground;
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
          <dt>Colors Used</dt>
          <dd>{summary.actualColorsLabel}</dd>
        </div>
        <div>
          <dt>Total Beads</dt>
          <dd>{summary.totalBeadsLabel}</dd>
        </div>
        <div>
          <dt>Bead Color Set</dt>
          <dd>{selectedColorSetLabel}</dd>
        </div>
        <div>
          <dt>Pattern Background</dt>
          <dd>{BACKGROUND_LABELS[patternBackground]}</dd>
        </div>
      </dl>
    </section>
  );
}
