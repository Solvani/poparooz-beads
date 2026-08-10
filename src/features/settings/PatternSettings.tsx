import type { ReactNode } from "react";

import { Button } from "../../components/ui/Button";
import type {
  ColorSetProfileOption,
  PatternSettingsDraft,
} from "./settings.types";
import { PATTERN_SIZE_PRESETS } from "./settings.types";
import { validatePatternSettings } from "./settings-validation";

export interface PatternSettingsProps {
  readonly value: PatternSettingsDraft;
  readonly onChange: (value: PatternSettingsDraft) => void;
  readonly generationControls?: ReactNode;
  readonly colorSetProfiles: readonly ColorSetProfileOption[];
}

export function PatternSettings({
  value,
  onChange,
  generationControls,
  colorSetProfiles,
}: PatternSettingsProps) {
  const validation = validatePatternSettings(value, colorSetProfiles);
  const errors = validation.valid ? {} : validation.errors;

  const update = <Key extends keyof PatternSettingsDraft>(
    key: Key,
    nextValue: PatternSettingsDraft[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <section className="pattern-settings" aria-labelledby="settings-heading">
      <h3 id="settings-heading">Pattern Settings</h3>
      <PatternSizeSetting value={value} onChange={onChange} />
      {errors.dimensions ? (
        <p className="form-error" role="alert">
          {errors.dimensions}
        </p>
      ) : null}
      <div className="form-field">
        <label htmlFor="color-set-profile">Bead Color Set</label>
        <select
          id="color-set-profile"
          value={
            colorSetProfiles.some(
              (profile) =>
                profile.profileId === value.selectedColorSetProfileId,
            )
              ? value.selectedColorSetProfileId
              : ""
          }
          disabled={colorSetProfiles.length === 0}
          aria-invalid={errors.selectedColorSetProfileId ? "true" : undefined}
          aria-describedby={
            errors.selectedColorSetProfileId
              ? "color-set-profile-error"
              : undefined
          }
          onChange={(event) =>
            update(
              "selectedColorSetProfileId",
              event.currentTarget
                .value as PatternSettingsDraft["selectedColorSetProfileId"],
            )
          }
        >
          {colorSetProfiles.length === 0 ? (
            <option value="">Color sets unavailable</option>
          ) : null}
          {colorSetProfiles.map((profile) => (
            <option key={profile.profileId} value={profile.profileId}>
              {profile.size}-Color Set
            </option>
          ))}
        </select>
        {errors.selectedColorSetProfileId ? (
          <p id="color-set-profile-error" className="form-error" role="alert">
            {errors.selectedColorSetProfileId}
          </p>
        ) : null}
      </div>
      <NumberSetting
        id="maximum-colors"
        label="Pattern Color Limit"
        help="Maximum number of colors used in the generated pattern."
        value={value.maxColors}
        min={2}
        max={64}
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
      {generationControls === undefined ? (
        <>
          <Button className="generate-placeholder" disabled>
            Generate Pattern
          </Button>
          <p className="form-help">
            Pattern generation is not available in this preview.
          </p>
        </>
      ) : (
        generationControls
      )}
    </section>
  );
}

function PatternSizeSetting({
  value,
  onChange,
}: {
  readonly value: PatternSettingsDraft;
  readonly onChange: (value: PatternSettingsDraft) => void;
}) {
  const selected = PATTERN_SIZE_PRESETS.find(
    (preset) =>
      String(preset.size) === value.width && value.width === value.height,
  );
  return (
    <div className="form-field">
      <label htmlFor="pattern-size">Pattern Size</label>
      <select
        id="pattern-size"
        value={selected?.size ?? ""}
        aria-describedby="pattern-size-help"
        onChange={(event) => {
          const size = event.currentTarget.value;
          onChange({ ...value, width: size, height: size });
        }}
      >
        {selected === undefined ? (
          <option value="">Choose a size</option>
        ) : null}
        {PATTERN_SIZE_PRESETS.map((preset) => (
          <option key={preset.size} value={preset.size}>
            {preset.size} × {preset.size}
            {preset.size === 80 ? " — Recommended" : ""}
          </option>
        ))}
      </select>
      <p id="pattern-size-help" className="form-help">
        {selected?.guidance ?? "Choose a supported square Pattern Size."}
      </p>
    </div>
  );
}

interface NumberSettingProps {
  readonly id: string;
  readonly label: string;
  readonly help?: string;
  readonly value: string;
  readonly min: number;
  readonly max: number;
  readonly error?: string;
  readonly onChange: (value: string) => void;
}

function NumberSetting({
  id,
  label,
  help,
  value,
  min,
  max,
  error,
  onChange,
}: NumberSettingProps) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
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
        aria-describedby={
          [help ? helpId : undefined, error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {help ? (
        <p id={helpId} className="form-help">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
