import type { ReactNode } from "react";

import { Button } from "../../components/ui/Button";
import { MAX_TARGET_DIMENSION, MIN_TARGET_DIMENSION } from "../../domain/image";
import { MAX_QUANTIZATION_COLORS } from "../../domain/quantization/quantization-options";
import type { PatternSettingsDraft } from "./settings.types";
import { validatePatternSettings } from "./settings-validation";

export interface PatternSettingsProps {
  readonly value: PatternSettingsDraft;
  readonly onChange: (value: PatternSettingsDraft) => void;
  readonly generationControls?: ReactNode;
}

export function PatternSettings({
  value,
  onChange,
  generationControls,
}: PatternSettingsProps) {
  const validation = validatePatternSettings(value);
  const errors = validation.valid ? {} : validation.errors;

  const update = <Key extends keyof PatternSettingsDraft>(
    key: Key,
    nextValue: PatternSettingsDraft[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <section className="pattern-settings" aria-labelledby="settings-heading">
      <h3 id="settings-heading">Pattern Settings</h3>
      <div className="settings-grid">
        <NumberSetting
          id="pattern-width"
          label="Pattern Width"
          value={value.width}
          min={MIN_TARGET_DIMENSION}
          max={MAX_TARGET_DIMENSION}
          error={value.width === "" ? undefined : errors.width}
          onChange={(nextValue) => update("width", nextValue)}
        />
        <NumberSetting
          id="pattern-height"
          label="Pattern Height"
          value={value.height}
          min={MIN_TARGET_DIMENSION}
          max={MAX_TARGET_DIMENSION}
          error={value.height === "" ? undefined : errors.height}
          onChange={(nextValue) => update("height", nextValue)}
        />
      </div>
      {errors.dimensions ? (
        <p className="form-error" role="alert">
          {errors.dimensions}
        </p>
      ) : null}
      <NumberSetting
        id="maximum-colors"
        label="Maximum Colors"
        value={value.maxColors}
        min={1}
        max={MAX_QUANTIZATION_COLORS}
        error={value.maxColors === "" ? undefined : errors.maxColors}
        onChange={(nextValue) => update("maxColors", nextValue)}
      />
      <fieldset className="background-setting">
        <legend>Background</legend>
        <label>
          <input
            type="radio"
            name="pattern-background"
            value="white"
            checked={value.background === "white"}
            onChange={() => update("background", "white")}
          />
          White
        </label>
        <label>
          <input
            type="radio"
            name="pattern-background"
            value="transparent"
            checked={value.background === "transparent"}
            onChange={() => update("background", "transparent")}
          />
          Transparent
        </label>
      </fieldset>
      {generationControls ?? (
        <>
          <Button className="generate-placeholder" disabled>
            Generate Pattern
          </Button>
          <p className="form-help">
            Pattern generation is not available in this preview.
          </p>
        </>
      )}
    </section>
  );
}

interface NumberSettingProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly min: number;
  readonly max: number;
  readonly error?: string;
  readonly onChange: (value: string) => void;
}

function NumberSetting({
  id,
  label,
  value,
  min,
  max,
  error,
  onChange,
}: NumberSettingProps) {
  const errorId = `${id}-error`;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {error ? (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
