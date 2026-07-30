import type { ReactNode } from "react";

import type { WorkspaceMode } from "../responsive/workspace-mode";
import { Panel } from "../ui/Panel";

export interface GeneratorWorkspaceShellProps {
  readonly settingsContent?: ReactNode;
  readonly canvasContent?: ReactNode;
  readonly resultsContent?: ReactNode;
  readonly actionsContent?: ReactNode;
  readonly lifecycleContent?: ReactNode;
  readonly canvasStatusContent?: ReactNode;
  readonly imageReady?: boolean;
  readonly showSettingsRegion?: boolean;
  readonly workspaceMode?: WorkspaceMode;
}

export function GeneratorWorkspaceShell({
  settingsContent,
  canvasContent,
  resultsContent,
  actionsContent,
  lifecycleContent,
  canvasStatusContent,
  imageReady = false,
  showSettingsRegion = true,
  workspaceMode = "desktop",
}: GeneratorWorkspaceShellProps) {
  return (
    <main
      className={`workspace-shell workspace-shell--${workspaceMode}`}
      aria-label="Pattern maker workspace"
      data-workspace-mode={workspaceMode}
    >
      {lifecycleContent ? (
        <section
          className="workspace-shell__lifecycle"
          aria-label="Pattern status"
        >
          {lifecycleContent}
        </section>
      ) : null}

      {showSettingsRegion ? (
        <Panel
          title="Start with an image"
          titleId="create-heading"
          eyebrow="Create"
          className="workspace-shell__settings"
        >
          {settingsContent ?? (
            <p>Upload and pattern controls will appear here.</p>
          )}
        </Panel>
      ) : null}

      <Panel
        title="Your pattern will appear here."
        titleId="canvas-heading"
        eyebrow="Pattern Canvas"
        className="workspace-shell__canvas panel--canvas"
      >
        {canvasStatusContent}
        {canvasContent ?? (
          <div className="empty-state">
            <p>
              {imageReady
                ? "Your image is ready. Generate the pattern in the next step."
                : "Upload an image and generate a pattern to begin."}
            </p>
          </div>
        )}
      </Panel>

      <Panel
        as="aside"
        title={
          resultsContent === undefined
            ? "Your pattern details will appear here."
            : "Pattern details"
        }
        titleId="summary-heading"
        eyebrow="Pattern Summary"
        className="workspace-shell__results"
      >
        {resultsContent ?? (
          <>
            <section
              className="summary-section"
              aria-labelledby="colors-heading"
            >
              <h3 id="colors-heading">Colors</h3>
              <p>Color quantities will appear after generation.</p>
            </section>
            <section
              className="summary-section"
              aria-labelledby="boards-heading"
            >
              <h3 id="boards-heading">Board Layout</h3>
              <p>Board placement will appear after generation.</p>
            </section>
          </>
        )}
        {actionsContent}
      </Panel>
    </main>
  );
}
