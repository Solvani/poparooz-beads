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
  readonly useDesktopPatternSizeSelector?: boolean;
}

export function PatternSettings({
  value,
  onChange,
  generationControls,
  colorSetProfiles,
  useDesktopPatternSizeSelector = false,
}: PatternSettingsProps) {
  const validation = validatePatternSettings(value, colorSetProfiles);
  const errors = validation.valid ? {} : validation.errors;

  const update = <Key extends keyof PatternSettingsDraft>(
    key: Key,
    nextValue: PatternSettingsDraft[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <section className="pattern-settings" aria-labelledby="settings-heading">
      <h3 id="settings-heading">2. Settings</h3>
      <PatternSizeSetting
        value={value}
        onChange={onChange}
        useButtonSelector={useDesktopPatternSizeSelector}
      />
      {errors.dimensions ? (
        <p className="form-error" role="alert">
          {errors.dimensions}
        </p>
      ) : null}
      <div className="form-field">
        <label htmlFor="color-set-profile">Generation Color Set</label>
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
              ? "color-set-profile-help color-set-profile-error"
              : "color-set-profile-help"
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
        <p id="color-set-profile-help" className="form-help">
          Choose the Poparooz color range available for matching.
        </p>
        {errors.selectedColorSetProfileId ? (
          <p id="color-set-profile-error" className="form-error" role="alert">
            {errors.selectedColorSetProfileId}
          </p>
        ) : null}
      </div>
      <NumberSetting
        id="maximum-colors"
        label="Maximum Colors"
        help="Maximum number of colors used in the generated pattern. This does not change the selected Generation Color Set."
        value={value.maxColors}
        min={2}
        max={64}
        error={value.maxColors === "" ? undefined : errors.maxColors}
        onChange={(nextValue) => update("maxColors", nextValue)}
      />
      <div className="bead-size-spec" aria-label="Bead Size: 2.6 millimeters">
        <span>Bead Size</span>
        <strong>2.6 mm</strong>
      </div>
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
          <span className="background-setting__copy">
            <strong>Full Background</strong>
            <span>White</span>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="pattern-background"
            value="transparent"
            checked={value.background === "transparent"}
            onChange={() => update("background", "transparent")}
          />
          <span className="background-setting__copy">
            <strong>Remove Background</strong>
            <span>Transparent</span>
          </span>
        </label>
      </fieldset>
      {generationControls === undefined ? (
        <>
          <Button
            className="generate-placeholder generation-status__action"
            disabled
          >
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
  useButtonSelector,
}: {
  readonly value: PatternSettingsDraft;
  readonly onChange: (value: PatternSettingsDraft) => void;
  readonly useButtonSelector: boolean;
}) {
  const selected = PATTERN_SIZE_PRESETS.find(
    (preset) =>
      String(preset.size) === value.width && value.width === value.height,
  );
  if (useButtonSelector) {
    return (
      <fieldset className="pattern-size-setting">
        <legend>Pattern Size</legend>
        <div className="pattern-size-selector">
          {PATTERN_SIZE_PRESETS.map((preset) => (
            <button
              key={preset.size}
              type="button"
              className="pattern-size-selector__option"
              aria-pressed={selected?.size === preset.size}
              onClick={() => {
                const size = String(preset.size);
                onChange({ ...value, width: size, height: size });
              }}
            >
              {preset.size} × {preset.size}
            </button>
          ))}
        </div>
        <p className="form-help">
          {selected?.guidance ?? "Choose a supported square Pattern Size."}
        </p>
      </fieldset>
    );
  }

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
            {preset.size} × {preset.size} — {preset.label}
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
