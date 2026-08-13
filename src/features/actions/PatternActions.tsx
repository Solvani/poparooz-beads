import { useState } from "react";

import type { PatternDownloadResult } from "../download/pattern-download";
import { PatternActionButton } from "./PatternActionButton";
import type { PatternActionState } from "./pattern-action.types";

export interface PatternActionsProps {
  readonly state: PatternActionState;
  readonly onDownload?: () => Promise<PatternDownloadResult>;
}

export function PatternActions({ state, onDownload }: PatternActionsProps) {
  const [downloadFeedback, setDownloadFeedback] = useState<{
    readonly resultIdentity: number | null;
    readonly message: string;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!state.downloadEnabled || onDownload === undefined || downloading)
      return;
    setDownloading(true);
    setDownloadFeedback(null);
    const result = await onDownload();
    setDownloading(false);
    setDownloadFeedback({
      resultIdentity: state.resultIdentity,
      message: result.ok ? "Pattern download ready." : result.message,
    });
  };

  return (
    <section
      className="summary-section pattern-actions"
      aria-labelledby="pattern-options-heading"
    >
      <h3 id="pattern-options-heading">Save / Download</h3>
      <p className="pattern-actions__availability">
        {state.availabilityMessage}
      </p>
      {state.scopeMessage ? (
        <p className="pattern-actions__scope" role="status">
          {state.scopeMessage}
        </p>
      ) : null}
      <div className="pattern-actions__buttons">
        <PatternActionButton
          enabled={state.downloadEnabled}
          label="Save / Download Pattern"
          note="Color code pattern · PNG"
          variant="primary"
          busy={downloading}
          onClick={() => void download()}
        />
      </div>
      {downloadFeedback?.resultIdentity === state.resultIdentity ? (
        <p className="pattern-actions__download-status" role="status">
          {downloadFeedback.message}
        </p>
      ) : null}
    </section>
  );
}
