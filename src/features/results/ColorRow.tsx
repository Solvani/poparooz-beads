import type { ColorRowView } from "./result.types";

export function ColorRow({ row }: { readonly row: ColorRowView }) {
  return (
    <li className="color-row">
      <span
        className="color-row__swatch"
        style={{ backgroundColor: row.hex }}
        aria-hidden="true"
      />
      <span className="color-row__identity">
        <strong>{row.code}</strong>
        <span>{row.name}</span>
      </span>
      <span className="color-row__count">{row.beadCountLabel}</span>
    </li>
  );
}
