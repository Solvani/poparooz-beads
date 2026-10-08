import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { PatternActions } from "../actions/PatternActions";
import type { PatternActionState } from "../actions/pattern-action.types";
import type { PatternExportInput } from "./pattern-export";
import type { PatternDownloadResult } from "./pattern-download";

export function PatternSheetDownloads({
  state,
  input,
  onDownload,
}: {
  readonly state: PatternActionState;
  readonly input?: PatternExportInput;
  readonly onDownload: () => Promise<PatternDownloadResult>;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    identity: PatternActionState["resultIdentity"];
    message: string;
  } | null>(null);
  if (!input)
    return <PatternActions state={state} onDownload={() => onDownload()} />;
  const download = async () => {
    if (busy || !state.downloadEnabled) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await onDownload();
      setFeedback({
        identity: state.resultIdentity,
        message: result.ok ? "Pattern download ready." : result.message,
      });
    } catch {
      setFeedback({
        identity: state.resultIdentity,
        message: "We couldn’t prepare this pattern download.",
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="summary-section pattern-actions"
      aria-labelledby="pattern-sheet-heading"
    >
      <h3 id="pattern-sheet-heading">Pattern Sheet</h3>
      <p className="pattern-actions__availability">
        {state.availabilityMessage}
      </p>
      <p className="result-secondary">
        One complete {input.pattern.matrix.width} ×{" "}
        {input.pattern.matrix.height} color-code pattern PNG.
      </p>
      {state.scopeMessage ? <p role="status">{state.scopeMessage}</p> : null}
      <p className="result-secondary">
        5/10-cell reading guides · Not extra boards · Not a calibrated
        actual-size print.
      </p>
      <div className="pattern-actions__buttons">
        <Button
          variant="primary"
          disabled={!state.downloadEnabled || busy}
          aria-busy={busy}
          onClick={() => void download()}
        >
          Download Pattern Sheet
        </Button>
      </div>
      {feedback?.identity === state.resultIdentity ? (
        <p role="status">{feedback.message}</p>
      ) : null}
    </section>
  );
}
