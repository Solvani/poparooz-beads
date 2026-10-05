import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { PatternActions } from "../actions/PatternActions";
import type { PatternActionState } from "../actions/pattern-action.types";
import type { PatternExportInput } from "./pattern-export";
import type { PatternDownloadResult } from "./pattern-download";
import { segmentPatternIntoReadingSheets } from "./reading-sheets";

export function PatternSheetDownloads({
  state,
  input,
  onDownload,
}: {
  readonly state: PatternActionState;
  readonly input?: PatternExportInput;
  readonly onDownload: (target?: string) => Promise<PatternDownloadResult>;
}) {
  const sheets = useMemo(() => {
    if (!input) return null;
    try {
      return segmentPatternIntoReadingSheets(input.pattern);
    } catch {
      return null;
    }
  }, [input]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    identity: PatternActionState["resultIdentity"];
    message: string;
  } | null>(null);
  if (!input)
    return <PatternActions state={state} onDownload={() => onDownload()} />;
  if (!sheets)
    return <p role="status">We couldn’t prepare the pattern sheets.</p>;
  const download = async (target: string) => {
    if (busy || !state.downloadEnabled) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await onDownload(target);
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
      aria-labelledby="pattern-sheets-heading"
    >
      <h3 id="pattern-sheets-heading">Pattern Sheets</h3>
      <p className="pattern-actions__availability">
        {state.availabilityMessage}
      </p>
      <p className="result-secondary">
        {sheets.length} reading {sheets.length === 1 ? "sheet" : "sheets"} ·{" "}
        {input.pattern.boardLayout.boardCount} required physical board. Reading
        sheets are not extra boards.
      </p>
      {state.scopeMessage ? <p role="status">{state.scopeMessage}</p> : null}
      <p className="result-secondary">
        Local coordinates reset per sheet · 5/10-cell guides · Individual PNGs,
        not actual-size prints.
      </p>
      <div className="pattern-actions__buttons">
        {sheets.length > 1 ? (
          <Button
            disabled={!state.downloadEnabled || busy}
            onClick={() => void download("overview")}
          >
            Overview
          </Button>
        ) : null}
        {sheets.map((sheet) => (
          <div key={sheet.sectionId}>
            <Button
              variant={sheets.length === 1 ? "primary" : "secondary"}
              disabled={!state.downloadEnabled || busy}
              onClick={() => void download(sheet.sectionId)}
            >
              {sheets.length === 1
                ? "Download Pattern Sheet"
                : `Section ${sheet.sectionId}`}
            </Button>
            <p className="result-secondary">
              Section {sheet.sectionId} · {sheet.width} × {sheet.height}
              <br />
              Global X {sheet.globalStartX}–{sheet.globalEndX} · Y{" "}
              {sheet.globalStartY}–{sheet.globalEndY}
            </p>
          </div>
        ))}
      </div>
      {feedback?.identity === state.resultIdentity ? (
        <p role="status">{feedback.message}</p>
      ) : null}
    </section>
  );
}
