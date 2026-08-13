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
  const hasResults =
    resultsContent !== undefined || actionsContent !== undefined;
  const showResultsRegion = hasResults || workspaceMode === "desktop";

  return (
    <main
      className={`workspace-shell workspace-shell--${workspaceMode}${
        hasResults ? " workspace-shell--has-results" : ""
      }`}
      aria-label="Pattern maker workspace"
      data-workspace-mode={workspaceMode}
      data-has-results={hasResults ? "true" : "false"}
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
          title="1. Upload Image"
          titleId="create-heading"
          className="workspace-shell__settings"
        >
          {settingsContent ?? (
            <p>Upload and pattern controls will appear here.</p>
          )}
        </Panel>
      ) : null}

      <Panel
        title="Pattern Canvas"
        titleId="canvas-heading"
        eyebrow={hasResults ? "Pattern" : undefined}
        className="workspace-shell__canvas panel--canvas"
      >
        {canvasStatusContent}
        {canvasContent ?? (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">
              &#9638;
            </span>
            <h3>Your pattern preview will appear here</h3>
            <p>
              {imageReady
                ? "Your image is ready. Generate the pattern in the next step."
                : "Upload an image and generate a pattern to begin."}
            </p>
          </div>
        )}
      </Panel>

      {showResultsRegion ? (
        <Panel
          as="aside"
          title="Results"
          titleId="summary-heading"
          className="workspace-shell__results"
        >
          {hasResults ? (
            <>
              {resultsContent}
              {actionsContent}
            </>
          ) : (
            <div className="results-empty-state">
              <div className="results-empty-state__message">
                <span className="results-empty-state__icon" aria-hidden="true">
                  &#9638;
                </span>
                <h3>Your results will appear here</h3>
                <p>
                  After you generate a pattern, you’ll see your pattern summary,
                  recommendations, bead requirements, and download options.
                </p>
              </div>
              <button
                type="button"
                className="button button--primary results-empty-state__action"
                disabled
              >
                Save / Download Pattern
              </button>
            </div>
          )}
        </Panel>
      ) : null}
    </main>
  );
}
