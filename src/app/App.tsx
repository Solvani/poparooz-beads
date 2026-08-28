import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
import {
  UNAVAILABLE_EMAIL_GATE_CAPABILITY,
  type EmailGateCapability,
} from "../email-gate/email-gate-capability";
import {
  createEmailGateDownloadCoordinator,
  type EmailGateCompletion,
} from "../email-gate/download-coordinator";

const EmailGateDialog = lazy(async () => {
  const presentation = await import("../email-gate/EmailGateDialog");
  return { default: presentation.EmailGateDialog };
});

export interface AppProps {
  readonly generationRuntime?: GenerationRuntime;
  readonly emailGateCapability?: EmailGateCapability;
}

export function App({
  generationRuntime = UNAVAILABLE_GENERATION_RUNTIME,
  emailGateCapability = UNAVAILABLE_EMAIL_GATE_CAPABILITY,
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
  const [emailGateOpen, setEmailGateOpen] = useState(false);
  const [pendingDownloadIdentity, setPendingDownloadIdentity] = useState<
    number | null
  >(null);
  const committedLastSuccessIdentityRef = useRef<number | null>(null);
  const enabledEmailGate =
    "client" in emailGateCapability ? emailGateCapability : null;
  const downloadCoordinator = useMemo(
    () =>
      enabledEmailGate === null
        ? null
        : createEmailGateDownloadCoordinator<number>(
            enabledEmailGate.unlockStore,
          ),
    [enabledEmailGate],
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
  const emailGatePatternReplaced =
    emailGateOpen &&
    pendingDownloadIdentity !== null &&
    lastSuccess?.snapshot.jobId !== pendingDownloadIdentity;
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

  useLayoutEffect(() => {
    const committedIdentity = lastSuccess?.snapshot.jobId ?? null;
    committedLastSuccessIdentityRef.current = committedIdentity;
    if (!emailGateOpen || downloadCoordinator === null) return;
    downloadCoordinator.cancelUnless(committedIdentity);
  }, [downloadCoordinator, emailGateOpen, lastSuccess]);

  const removeImage = () => {
    downloadCoordinator?.cancel();
    setEmailGateOpen(false);
    setPendingDownloadIdentity(null);
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
          materials={compactResult.view.materials}
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
    const input = {
      pattern: lastSuccess.result,
      selectedColorSetLabel,
    };
    if (enabledEmailGate === null) {
      return patternDownloader.download(input);
    }
    if (enabledEmailGate.unlockStore.isUnlocked()) {
      return patternDownloader.download(input);
    }
    downloadCoordinator?.begin(lastSuccess.snapshot.jobId, () =>
      patternDownloader.download(input),
    );
    setPendingDownloadIdentity(lastSuccess.snapshot.jobId);
    setEmailGateOpen(true);
    return Promise.resolve({ ok: true as const });
  }

  const closeEmailGate = () => {
    downloadCoordinator?.cancel();
    setEmailGateOpen(false);
    setPendingDownloadIdentity(null);
  };

  const completeEmailGate = async (): Promise<EmailGateCompletion> => {
    if (enabledEmailGate === null) {
      return { outcome: "pattern-replaced" };
    }
    if (downloadCoordinator === null) return { outcome: "pattern-replaced" };
    return downloadCoordinator.complete(
      committedLastSuccessIdentityRef.current,
    );
  };

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
      {emailGateOpen && enabledEmailGate !== null ? (
        <EmailGatePresentationBoundary onClose={closeEmailGate}>
          <Suspense
            fallback={<EmailGateLoadingFallback onClose={closeEmailGate} />}
          >
            <EmailGateDialog
              capability={enabledEmailGate}
              patternReplaced={emailGatePatternReplaced}
              onClose={closeEmailGate}
              onVerified={completeEmailGate}
            />
          </Suspense>
        </EmailGatePresentationBoundary>
      ) : null}
    </div>
  );
}

interface EmailGateBoundaryProps {
  readonly children: ReactNode;
  readonly onClose: () => void;
}

class EmailGatePresentationBoundary extends Component<
  EmailGateBoundaryProps,
  Readonly<{ failed: boolean }>
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alertdialog" aria-label="Download unlock unavailable">
          <p>Download unlock is temporarily unavailable.</p>
          <button type="button" onClick={this.props.onClose}>
            Close
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function EmailGateLoadingFallback({
  onClose,
}: {
  readonly onClose: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Loading download unlock">
      <p>Loading download unlock…</p>
      <button type="button" onClick={onClose}>
        Close
      </button>
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
