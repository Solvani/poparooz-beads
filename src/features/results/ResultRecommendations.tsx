import type { ColorRowView, PatternSummaryView } from "./result.types";
import { recommendBoardSetup } from "./board-recommendation";
import { recommendBeadSet } from "./recommendation-policy";
import { findRequiredApprovedBeadSet } from "./required-bead-set";

export function ResultRecommendations({
  summary,
  colors,
}: {
  readonly summary: PatternSummaryView;
  readonly colors: readonly ColorRowView[];
}) {
  const requiredBeadSet = findRequiredApprovedBeadSet(
    colors.map((color) => color.code),
  );
  const recommendedBeadSet = recommendBeadSet({ requiredBeadSet });
  const boardSetup = recommendBoardSetup({
    width: summary.width,
    height: summary.height,
  });
  return (
    <>
      <section
        className="result-recommendation bead-set-requirements"
        aria-labelledby="bead-set-requirements-heading"
      >
        <span className="result-recommendation__badge">Bead Sets</span>
        <h3 id="bead-set-requirements-heading">Bead Set Requirements</h3>
        {requiredBeadSet === null || recommendedBeadSet === null ? (
          <p className="result-recommendation__unavailable">
            No published set covers every color in this pattern.
          </p>
        ) : (
          <div className="bead-set-requirements__items">
            <div className="bead-set-requirements__item">
              <h4>Required Bead Set</h4>
              <p className="result-recommendation__value">
                {requiredBeadSet.label}
              </p>
              <p className="result-recommendation__support">
                Smallest set that includes every color used in your pattern.
              </p>
            </div>
            <div className="bead-set-requirements__item">
              <h4>Recommended Bead Set</h4>
              <p className="result-recommendation__value">
                {recommendedBeadSet.label}
              </p>
              <p className="result-recommendation__support">
                Recommended for this pattern. It is also the minimum set
                required.
              </p>
            </div>
          </div>
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
