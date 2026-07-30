import { useState } from "react";

import { AppHeader } from "../components/layout/AppHeader";
import { GeneratorWorkspaceShell } from "../components/layout/GeneratorWorkspaceShell";
import { GenerationStatus } from "../features/generator/GenerationStatus";
import { getLastSuccess } from "../features/generator/generator-state";
import {
  UNAVAILABLE_GENERATION_RUNTIME,
  type GenerationRuntime,
} from "../features/generator/generation.types";
import { useGeneratorController } from "../features/generator/use-generator-controller";
import { PatternCanvas } from "../features/pattern-canvas/PatternCanvas";
import { PatternResults } from "../features/results/PatternResults";
import { PatternSettings } from "../features/settings/PatternSettings";
import {
  EMPTY_PATTERN_SETTINGS,
  type PatternSettingsDraft,
} from "../features/settings/settings.types";
import { ImagePreview } from "../features/upload/ImagePreview";
import { ImageUpload } from "../features/upload/ImageUpload";
import { useImageSource } from "../features/upload/use-image-source";

export interface AppProps {
  readonly generationRuntime?: GenerationRuntime;
}

export function App({
  generationRuntime = UNAVAILABLE_GENERATION_RUNTIME,
}: AppProps) {
  const image = useImageSource();
  const [settings, setSettings] = useState<PatternSettingsDraft>(
    EMPTY_PATTERN_SETTINGS,
  );
  const generator = useGeneratorController({
    file: image.source?.file ?? null,
    imageVersion: image.revision,
    settings,
    runtime: generationRuntime,
  });
  const lastSuccess = getLastSuccess(generator.state);
  const visiblePattern = lastSuccess?.result;

  const removeImage = () => {
    generator.reset();
    image.removeImage();
  };

  return (
    <div className="app-root">
      <AppHeader />
      <div className="page-frame">
        <GeneratorWorkspaceShell
          imageReady={image.source !== null}
          canvasContent={
            visiblePattern === undefined ? undefined : (
              <PatternCanvas
                key={lastSuccess?.snapshot.jobId}
                pattern={visiblePattern}
              />
            )
          }
          resultsContent={
            visiblePattern === undefined ? undefined : (
              <PatternResults
                key={lastSuccess?.snapshot.jobId}
                pattern={visiblePattern}
                status={generator.state.status}
              />
            )
          }
          settingsContent={
            <div className="settings-region-content">
              {image.source === null ? (
                <ImageUpload
                  error={image.error}
                  onSelectFiles={image.selectFiles}
                />
              ) : (
                <>
                  <ImagePreview
                    source={image.source}
                    onReplace={image.selectFiles}
                    onRemove={removeImage}
                  />
                  {image.error ? (
                    <p className="form-error" role="alert" aria-live="polite">
                      {image.error.message}
                    </p>
                  ) : null}
                </>
              )}
              <PatternSettings
                value={settings}
                onChange={setSettings}
                generationControls={
                  <GenerationStatus
                    state={generator.state}
                    availability={generator.availability}
                    canGenerate={generator.canGenerate}
                    canRegenerate={generator.canRegenerate}
                    onGenerate={generator.generate}
                    onAbort={generator.abort}
                  />
                }
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
