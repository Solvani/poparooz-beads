import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { ColorRow } from "./ColorRow";
import type { ColorRowView } from "./result.types";

export const DEFAULT_VISIBLE_COLORS = 8;

export function ColorList({
  colors,
  focusedColorIndex,
  onFocusColor,
  onClearHighlight,
}: {
  readonly colors: readonly ColorRowView[];
  readonly focusedColorIndex: number | null;
  readonly onFocusColor: (colorIndex: number) => void;
  readonly onClearHighlight: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = colors.length > DEFAULT_VISIBLE_COLORS;
  const visibleColors = expanded
    ? colors
    : colors.slice(0, DEFAULT_VISIBLE_COLORS);
  const focusedColor = colors.find((row) => row.index === focusedColorIndex);
  return (
    <section
      className="result-section color-list-section"
      aria-labelledby="color-list-heading"
    >
      <div className="result-section__heading">
        <h3 id="color-list-heading">Colors</h3>
        <span>{colors.length} total</span>
      </div>
      {focusedColor === undefined ? null : (
        <div className="color-highlight-status">
          <span>
            <strong>{focusedColor.code}</strong> · {focusedColor.beadCountLabel}
          </span>
          <Button variant="tertiary" onClick={onClearHighlight}>
            Clear Highlight
          </Button>
        </div>
      )}
      <ul className="color-list" id="pattern-color-list">
        {visibleColors.map((row) => (
          <ColorRow
            key={row.index}
            row={row}
            selected={row.index === focusedColorIndex}
            onSelect={onFocusColor}
          />
        ))}
      </ul>
      {hasMore ? (
        <Button
          variant="tertiary"
          className="color-list__toggle"
          aria-expanded={expanded}
          aria-controls="pattern-color-list"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show fewer" : "Show all colors"}
        </Button>
      ) : null}
    </section>
  );
}
