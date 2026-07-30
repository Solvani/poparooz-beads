import { PatternActionButton } from "./PatternActionButton";
import type { PatternActionState } from "./pattern-action.types";

export interface PatternActionsProps {
  readonly state: PatternActionState;
}

export function PatternActions({ state }: PatternActionsProps) {
  return (
    <section
      className="summary-section pattern-actions"
      aria-labelledby="pattern-options-heading"
    >
      <h3 id="pattern-options-heading">Pattern Options</h3>
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
          label="Download Pattern"
          variant="secondary"
        />
        <PatternActionButton
          enabled={state.getBeadsEnabled}
          label="Get Beads for This Pattern"
          variant="primary"
        />
      </div>
    </section>
  );
}
