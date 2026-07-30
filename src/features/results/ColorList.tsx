import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { ColorRow } from "./ColorRow";
import type { ColorRowView } from "./result.types";

export const DEFAULT_VISIBLE_COLORS = 8;

export function ColorList({
  colors,
}: {
  readonly colors: readonly ColorRowView[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = colors.length > DEFAULT_VISIBLE_COLORS;
  const visibleColors = expanded
    ? colors
    : colors.slice(0, DEFAULT_VISIBLE_COLORS);
  return (
    <section
      className="result-section color-list-section"
      aria-labelledby="color-list-heading"
    >
      <div className="result-section__heading">
        <h3 id="color-list-heading">Colors</h3>
        <span>{colors.length} total</span>
      </div>
      <ul className="color-list" id="pattern-color-list">
        {visibleColors.map((row) => (
          <ColorRow key={row.index} row={row} />
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
