import type { ColorRowView, PatternSummaryView } from "./result.types";
import { recommendBoardSetup } from "./board-recommendation";
import { recommendApprovedColorSet } from "./recommended-color-set";

export function ResultRecommendations({
  summary,
  colors,
}: {
  readonly summary: PatternSummaryView;
  readonly colors: readonly ColorRowView[];
}) {
  const beadSet = recommendApprovedColorSet(colors.map((color) => color.code));
  const boardSetup = recommendBoardSetup({
    width: summary.width,
    height: summary.height,
  });
  return (
    <>
      <section
        className="result-recommendation"
        aria-labelledby="recommended-bead-set-heading"
      >
        <span className="result-recommendation__badge">Recommended</span>
        <h3 id="recommended-bead-set-heading">Recommended Bead Set</h3>
        {beadSet === null ? (
          <p className="result-recommendation__unavailable">
            No published set covers every color in this pattern.
          </p>
        ) : (
          <>
            <p className="result-recommendation__value">{beadSet.label}</p>
            <p className="result-recommendation__support">
              Covers all {summary.actualColorsLabel} colors used in this
              pattern.
            </p>
          </>
        )}
      </section>
      <section
        className="result-recommendation"
        aria-labelledby="recommended-board-setup-heading"
      >
        <h3 id="recommended-board-setup-heading">Recommended Board Setup</h3>
        {boardSetup === null ? (
          <p className="result-recommendation__unavailable">
            No approved board setup is available for this pattern size.
          </p>
        ) : (
          <>
            <p className="result-recommendation__value">
              1 × {boardSetup.primary.beadWidth}×{boardSetup.primary.beadHeight}{" "}
              Board
            </p>
            <p className="result-recommendation__support">
              {boardSetup.primary.physicalWidthCm} ×{" "}
              {boardSetup.primary.physicalHeightCm} cm · Covers the full{" "}
              {summary.patternSize} pattern.
            </p>
            {boardSetup.modularAlternative === null ? null : (
              <p className="result-recommendation__alternative">
                <strong>Alternative Board Setup</strong>
                <span>
                  {boardSetup.modularAlternative.boardCount} × 52×52 Boards ·{" "}
                  {boardSetup.modularAlternative.columns}×
                  {boardSetup.modularAlternative.rows} layout ·{" "}
                  {boardSetup.modularAlternative.coverageWidth}×
                  {boardSetup.modularAlternative.coverageHeight} coverage
                </span>
                <span>14 × 14 cm each</span>
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
