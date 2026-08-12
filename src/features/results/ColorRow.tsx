import type { ColorRowView } from "./result.types";

export function ColorRow({
  row,
  selected,
  onSelect,
}: {
  readonly row: ColorRowView;
  readonly selected: boolean;
  readonly onSelect: (colorIndex: number) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="color-row"
        aria-label={`${row.code}, ${row.beadCountLabel}`}
        aria-pressed={selected}
        onClick={() => onSelect(row.index)}
      >
        <span
          className="color-row__swatch"
          style={{ backgroundColor: row.hex }}
          aria-hidden="true"
        />
        <span className="color-row__identity">
          <strong>{row.code}</strong>
          {row.name === undefined ? null : <span>{row.name}</span>}
          {selected ? (
            <span className="color-row__selected">Highlighted</span>
          ) : null}
        </span>
        <span className="color-row__count">{row.beadCountLabel}</span>
      </button>
    </li>
  );
}
