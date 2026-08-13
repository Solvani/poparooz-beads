import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "../components/layout/AppHeader";
import { GeneratorWorkspaceShell } from "../components/layout/GeneratorWorkspaceShell";
import { BottomSheet } from "../components/mobile/BottomSheet";
import { MobilePanelLaunchers } from "../components/mobile/MobilePanelLaunchers";
import type { MobilePanel } from "../components/mobile/mobile-panel.types";
import { useBottomSheet } from "../components/mobile/use-bottom-sheet";
import { useWorkspaceMode } from "../components/responsive/use-workspace-mode";
import { PatternActions } from "../features/actions/PatternActions";
import { toPatternActionState } from "../features/actions/pattern-action-state";
import { createPatternDownloader } from "../features/download/pattern-download";
import { GenerationStatus } from "../features/generator/GenerationStatus";
import { getLastSuccess } from "../features/generator/generator-state";
import {
  UNAVAILABLE_GENERATION_RUNTIME,
  type GenerationRuntime,
} from "../features/generator/generation.types";
import { useGeneratorController } from "../features/generator/use-generator-controller";
import { PatternCanvas } from "../features/pattern-canvas/PatternCanvas";
import {
  PatternResults,
  ResultRetentionStatus,
} from "../features/results/PatternResults";
import { ColorList } from "../features/results/ColorList";
import { PatternSummary } from "../features/results/PatternSummary";
import { ResultRecommendations } from "../features/results/ResultRecommendations";
import { toPatternResultView } from "../features/results/pattern-result-view";
import { PatternSettings } from "../features/settings/PatternSettings";
import {
  EMPTY_PATTERN_SETTINGS,
  type PatternSettingsDraft,
} from "../features/settings/settings.types";
import { ImagePreview } from "../features/upload/ImagePreview";
import { ImageUpload } from "../features/upload/ImageUpload";
import { useImageSource } from "../features/upload/use-image-source";
import { useGeneratorEmbedBridge } from "../runtime/embed/generator-embed-bridge";

export interface AppProps {
  readonly generationRuntime?: GenerationRuntime;
}

export function App({
  generationRuntime = UNAVAILABLE_GENERATION_RUNTIME,
}: AppProps) {
  useGeneratorEmbedBridge();
  const image = useImageSource();
  const { containerRef, mode: workspaceMode } = useWorkspaceMode();
  const {
    activePanel,
    open: openSheet,
    close: closeSheet,
    setActivePanel,
  } = useBottomSheet();
  const [settings, setSettings] = useState<PatternSettingsDraft>(
    EMPTY_PATTERN_SETTINGS,
  );
  const [focusedColorIndex, setFocusedColorIndex] = useState<number | null>(
    null,
  );
  const generator = useGeneratorController({
    file: image.source?.file ?? null,
    imageVersion: image.revision,
    settings,
    runtime: generationRuntime,
  });
  const lastSuccess = getLastSuccess(generator.state);
  const visiblePattern = lastSuccess?.result;
  const patternDownloader = useMemo(() => createPatternDownloader(), []);
  const selectedColorSetLabel = useMemo(() => {
    if (
      lastSuccess === undefined ||
      !generationRuntime.availability.available ||
      !("colorSetProfiles" in generationRuntime)
    ) {
      return null;
    }
    const selected = generationRuntime.colorSetProfiles.find(
      (profile) =>
        profile.profileId ===
        lastSuccess.snapshot.settings.selectedColorSetProfileId,
    );
    return selected ? `${selected.size}-Color Set` : null;
  }, [generationRuntime, lastSuccess]);
  const patternBackground = lastSuccess?.snapshot.settings.background ?? null;
  const patternActionState = toPatternActionState(generator.state);
  const compactResultMode =
    workspaceMode === "compact" && visiblePattern !== undefined;
  const compactResult = useMemo(
    () =>
      compactResultMode && visiblePattern
        ? toPatternResultView(visiblePattern)
        : null,
    [compactResultMode, visiblePattern],
  );

  useEffect(() => {
    if (!compactResultMode) closeSheet();
  }, [closeSheet, compactResultMode]);

  const removeImage = () => {
    closeSheet();
    setFocusedColorIndex(null);
    generator.reset();
    image.removeImage();
  };

  const generationStatus = (closeAfterGenerate = false) => (
    <GenerationStatus
      state={generator.state}
      availability={generator.availability}
      canGenerate={generator.canGenerate}
      canRegenerate={generator.canRegenerate}
      onGenerate={() => {
        setFocusedColorIndex(null);
        generator.generate();
        if (closeAfterGenerate) closeSheet();
      }}
      onAbort={generator.abort}
    />
  );

  const imagePreview = (closeAfterChange = false) =>
    image.source ? (
      <ImagePreview
        source={image.source}
        onReplace={(files) => {
          const result = image.selectFiles(files);
          if (closeAfterChange) closeSheet();
          return result;
        }}
        onRemove={removeImage}
      />
    ) : (
      <ImageUpload error={image.error} onSelectFiles={image.selectFiles} />
    );

  const settingsPanel = (
    insideSheet = false,
    omitGenerationControls = false,
  ) => (
    <PatternSettings
      value={settings}
      onChange={setSettings}
      colorSetProfiles={
        generationRuntime.availability.available &&
        "colorSetProfiles" in generationRuntime
          ? generationRuntime.colorSetProfiles
          : []
      }
      useDesktopPatternSizeSelector={workspaceMode === "desktop"}
      generationControls={
        omitGenerationControls ? null : generationStatus(insideSheet)
      }
    />
  );

  const sheetContent = (panel: MobilePanel) => {
    switch (panel) {
      case "settings":
        return settingsPanel(true);
      case "original":
        return imagePreview(true);
    }
  };

  const inlineSettings = (
    <div className="settings-region-content">
      {imagePreview()}
      {image.error && image.source ? (
        <p className="form-error" role="alert" aria-live="polite">
          {image.error.message}
        </p>
      ) : null}
      {settingsPanel(false, workspaceMode === "medium")}
    </div>
  );

  const compactResults =
    compactResult?.ok && patternBackground !== null ? (
      <div className="compact-result-content">
        <PatternSummary
          summary={compactResult.view.summary}
          selectedColorSetLabel={selectedColorSetLabel ?? "Unavailable"}
          patternBackground={patternBackground}
        />
        <ResultRecommendations
          summary={compactResult.view.summary}
          colors={compactResult.view.colors}
        />
        <ColorList
          key={lastSuccess?.snapshot.jobId}
          colors={compactResult.view.colors}
          focusedColorIndex={focusedColorIndex}
          onFocusColor={setFocusedColorIndex}
          onClearHighlight={() => setFocusedColorIndex(null)}
        />
        <PatternActions
          state={patternActionState}
          onDownload={() => downloadLastSuccess()}
        />
        <MobilePanelLaunchers onOpen={openSheet} />
      </div>
    ) : (
      <div className="compact-result-content">
        <ResultViewError />
        <MobilePanelLaunchers onOpen={openSheet} />
        <PatternActions
          state={patternActionState}
          onDownload={() => downloadLastSuccess()}
        />
      </div>
    );

  function downloadLastSuccess() {
    if (lastSuccess === undefined || selectedColorSetLabel === null) {
      return Promise.resolve({
        ok: false as const,
        message: "We couldn’t prepare this pattern download.",
      });
    }
    return patternDownloader.download({
      pattern: lastSuccess.result,
      selectedColorSetLabel,
    });
  }

  return (
    <div ref={containerRef} className="app-root">
      <AppHeader />
      <div className="page-frame">
        <GeneratorWorkspaceShell
          workspaceMode={workspaceMode}
          imageReady={image.source !== null}
          showSettingsRegion={!compactResultMode}
          lifecycleContent={
            compactResultMode ? (
              <>
                {generationStatus()}
                <ResultRetentionStatus status={generator.state.status} />
              </>
            ) : undefined
          }
          canvasStatusContent={
            workspaceMode === "medium" ? generationStatus() : undefined
          }
          actionsContent={
            compactResultMode || visiblePattern === undefined ? undefined : (
              <PatternActions
                state={patternActionState}
                onDownload={() => downloadLastSuccess()}
              />
            )
          }
          canvasContent={
            visiblePattern === undefined ? undefined : (
              <PatternCanvas
                key={lastSuccess?.snapshot.jobId}
                pattern={visiblePattern}
                focusedColorIndex={focusedColorIndex}
              />
            )
          }
          resultsContent={
            compactResultMode ? (
              compactResults
            ) : visiblePattern === undefined ||
              patternBackground === null ? undefined : (
              <PatternResults
                key={lastSuccess?.snapshot.jobId}
                pattern={visiblePattern}
                status={generator.state.status}
                selectedColorSetLabel={selectedColorSetLabel ?? "Unavailable"}
                patternBackground={patternBackground}
                focusedColorIndex={focusedColorIndex}
                onFocusColor={setFocusedColorIndex}
                onClearHighlight={() => setFocusedColorIndex(null)}
              />
            )
          }
          settingsContent={compactResultMode ? undefined : inlineSettings}
        />
      </div>
      {compactResultMode && activePanel ? (
        <BottomSheet
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          onClose={closeSheet}
        >
          {sheetContent(activePanel)}
        </BottomSheet>
      ) : null}
    </div>
  );
}

function ResultViewError() {
  return (
    <p className="result-view-error" role="status">
      We couldn’t display these pattern details.
    </p>
  );
}
