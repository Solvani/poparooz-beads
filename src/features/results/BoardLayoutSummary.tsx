import type { CSSProperties } from "react";

import type { BoardLayoutView } from "./result.types";

export function BoardLayoutSummary({
  layout,
}: {
  readonly layout: BoardLayoutView;
}) {
  const previewStyle = {
    "--board-preview-columns": layout.previewColumns,
    "--board-preview-rows": layout.previewRows,
  } as CSSProperties;
  return (
    <section
      className="result-section board-layout-section"
      aria-labelledby="board-layout-heading"
    >
      <h3 id="board-layout-heading">Board Layout</h3>
      <p className="board-layout__count">{layout.boardCountLabel}</p>
      <p className="result-secondary">{layout.dimensionsLabel}</p>
      {layout.boardCount === 1 ? null : layout.previewKind === "tiles" ? (
        <ul
          className="board-layout-preview board-layout-preview--tiles"
          style={previewStyle}
          aria-label={layout.accessibilityLabel}
        >
          {layout.tiles.map((tile) => (
            <li key={`${tile.row}:${tile.column}`} aria-label={tile.label} />
          ))}
        </ul>
      ) : (
        <div
          className="board-layout-preview board-layout-preview--compressed"
          style={previewStyle}
          role="img"
          aria-label={layout.accessibilityLabel}
        >
          <span>Large board layout preview</span>
        </div>
      )}
    </section>
  );
}
