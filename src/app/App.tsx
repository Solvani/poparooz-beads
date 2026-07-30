import { useState } from "react";

import { AppHeader } from "../components/layout/AppHeader";
import { GeneratorWorkspaceShell } from "../components/layout/GeneratorWorkspaceShell";
import { PatternSettings } from "../features/settings/PatternSettings";
import {
  EMPTY_PATTERN_SETTINGS,
  type PatternSettingsDraft,
} from "../features/settings/settings.types";
import { ImagePreview } from "../features/upload/ImagePreview";
import { ImageUpload } from "../features/upload/ImageUpload";
import { useImageSource } from "../features/upload/use-image-source";

export function App() {
  const image = useImageSource();
  const [settings, setSettings] = useState<PatternSettingsDraft>(
    EMPTY_PATTERN_SETTINGS,
  );

  return (
    <div className="app-root">
      <AppHeader />
      <div className="page-frame">
        <GeneratorWorkspaceShell
          imageReady={image.source !== null}
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
                    onRemove={image.removeImage}
                  />
                  {image.error ? (
                    <p className="form-error" role="alert" aria-live="polite">
                      {image.error.message}
                    </p>
                  ) : null}
                </>
              )}
              <PatternSettings value={settings} onChange={setSettings} />
            </div>
          }
        />
      </div>
    </div>
  );
}
