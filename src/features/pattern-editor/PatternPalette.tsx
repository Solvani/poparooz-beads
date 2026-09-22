import { memo, useMemo, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { getPatternEditorPalette } from "./pattern-document";
import { deriveUsedPatternColors } from "./pattern-batch-operations";
import type { PatternDocument } from "./pattern-editor.types";

export interface ReplacePreviewState {
  readonly sourceCode: string;
  readonly targetCode: string;
  readonly affectedCount: number;
}

export const PatternPalette = memo(function PatternPalette({
  document,
  selectedPaintColorCode,
  replacePreview,
  onSelectPaintColor,
  onPreviewReplace,
  onApplyReplace,
  onCancelReplace,
}: {
  readonly document: PatternDocument;
  readonly selectedPaintColorCode: string;
  readonly replacePreview: ReplacePreviewState | null;
  readonly onSelectPaintColor: (code: string) => void;
  readonly onPreviewReplace: (sourceCode: string, targetCode: string) => void;
  readonly onApplyReplace: () => void;
  readonly onCancelReplace: () => void;
}) {
  const palette = getPatternEditorPalette();
  const used = useMemo(() => deriveUsedPatternColors(document), [document]);
  const [query, setQuery] = useState("");
  const paletteRef = useRef<HTMLElement>(null);
  const [sourceCode, setSourceCode] = useState(used[0]?.code ?? "");
  const [targetCode, setTargetCode] = useState(selectedPaintColorCode);
  const filtered = useMemo(() => {
    const normalized = query.trim().toUpperCase();
    return normalized === ""
      ? palette.colors
      : palette.colors.filter((color) => color.code.includes(normalized));
  }, [palette.colors, query]);
  const currentSource = used.some((color) => color.code === sourceCode)
    ? sourceCode
    : (used[0]?.code ?? "");
  const previewDisabled = currentSource === "" || currentSource === targetCode;
  const returnFocusToPreviewTrigger = () => {
    window.requestAnimationFrame(() =>
      paletteRef.current
        ?.querySelector<HTMLButtonElement>("[data-replace-preview-trigger]")
        ?.focus(),
    );
  };

  return (
    <section
      className="pattern-palette"
      aria-label="Pattern palette"
      ref={paletteRef}
    >
      <div
        className="pattern-palette__section"
        aria-labelledby="used-pattern-colors-heading"
      >
        <h3 id="used-pattern-colors-heading">Used in Pattern</h3>
        {used.length === 0 ? (
          <p className="pattern-palette__empty">
            No colors are currently used.
          </p>
        ) : (
          <ul className="pattern-palette__used">
            {used.map((color) => (
              <li key={color.code}>
                <button
                  type="button"
                  className="pattern-palette__color"
                  aria-label={`${color.code}, ${color.count} beads`}
                  aria-pressed={selectedPaintColorCode === color.code}
                  onClick={() => onSelectPaintColor(color.code)}
                >
                  <span
                    className="pattern-palette__swatch"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  <strong>{color.code}</strong>
                  <span>{color.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="pattern-palette__all">
        <summary>All Poparooz Colors ({palette.colors.length})</summary>
        <label className="pattern-palette__search">
          Filter by code
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            inputMode="search"
          />
        </label>
        <ul className="pattern-palette__grid" aria-label="All Poparooz colors">
          {filtered.map((color) => (
            <li key={color.code}>
              <button
                type="button"
                className="pattern-palette__all-color"
                aria-label={`Select Poparooz ${color.code}`}
                aria-pressed={selectedPaintColorCode === color.code}
                onClick={() => onSelectPaintColor(color.code)}
              >
                <span
                  className="pattern-palette__swatch"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                />
                {color.code}
              </button>
            </li>
          ))}
        </ul>
      </details>

      <fieldset className="pattern-replace">
        <legend>Replace Color</legend>
        <label>
          Source color
          <select
            value={currentSource}
            disabled={used.length === 0}
            onChange={(event) => setSourceCode(event.currentTarget.value)}
          >
            {used.map((color) => (
              <option key={color.code} value={color.code}>
                {color.code}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target color
          <select
            value={targetCode}
            onChange={(event) => setTargetCode(event.currentTarget.value)}
          >
            {palette.colors.map((color) => (
              <option key={color.code} value={color.code}>
                {color.code}
              </option>
            ))}
          </select>
        </label>
        <Button
          data-replace-preview-trigger
          variant="secondary"
          disabled={previewDisabled}
          onClick={() => onPreviewReplace(currentSource, targetCode)}
        >
          Preview Replace
        </Button>
        {replacePreview !== null ? (
          <div className="pattern-batch-preview" aria-label="Replace preview">
            <p aria-live="polite">
              Replace {replacePreview.sourceCode} with{" "}
              {replacePreview.targetCode}
              <br />
              <strong>{replacePreview.affectedCount} beads affected</strong>
            </p>
            <div>
              <Button
                disabled={replacePreview.affectedCount === 0}
                onClick={() => {
                  onApplyReplace();
                  returnFocusToPreviewTrigger();
                }}
              >
                Apply
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  onCancelReplace();
                  returnFocusToPreviewTrigger();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </fieldset>
    </section>
  );
});
