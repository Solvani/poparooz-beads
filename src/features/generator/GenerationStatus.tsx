import { Button } from "../../components/ui/Button";
import type { GeneratorState } from "./generator-state";
import type { GenerationAvailability } from "./generation.types";

export interface GenerationStatusProps {
  readonly state: GeneratorState;
  readonly availability: GenerationAvailability;
  readonly canGenerate: boolean;
  readonly canRegenerate: boolean;
  readonly onGenerate: () => void;
  readonly onAbort: () => void;
}

export function GenerationStatus({
  state,
  availability,
  canGenerate,
  canRegenerate,
  onGenerate,
  onAbort,
}: GenerationStatusProps) {
  if (state.status === "processing") {
    return (
      <div className="generation-status" aria-live="polite">
        <p>Creating your pattern…</p>
        <Button variant="secondary" onClick={onAbort}>
          Abort
        </Button>
      </div>
    );
  }
  if (state.status === "regenerating") {
    return (
      <div className="generation-status" aria-live="polite">
        <p>Updating your pattern…</p>
        <p className="form-help">Your previous pattern is still available.</p>
        <Button variant="secondary" onClick={onAbort}>
          Abort
        </Button>
      </div>
    );
  }
  if (state.status === "dirty") {
    return (
      <div className="generation-status" aria-live="polite">
        <p>Settings changed</p>
        <p className="form-help">
          Regenerate the pattern to apply your new settings.
        </p>
        <Button
          className="generation-status__action"
          disabled={!canRegenerate}
          onClick={onGenerate}
        >
          Regenerate Pattern
        </Button>
      </div>
    );
  }
  if (state.status === "success") {
    return (
      <p className="generation-status" role="status">
        Pattern data is ready.
      </p>
    );
  }
  if (state.status === "aborted") {
    const hasPrevious = state.lastSuccess !== undefined;
    return (
      <div className="generation-status" aria-live="polite">
        <p>
          {hasPrevious
            ? "Pattern update stopped. Your previous pattern is still available."
            : "Pattern generation stopped."}
        </p>
        <Button
          className="generation-status__action"
          disabled={!canGenerate && !canRegenerate}
          onClick={onGenerate}
        >
          {hasPrevious ? "Regenerate Pattern" : "Try Again"}
        </Button>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="generation-status" role="alert">
        <p>{state.error.message}</p>
        <Button
          className="generation-status__action"
          disabled={!canGenerate && !canRegenerate}
          onClick={onGenerate}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="generation-status">
      <Button
        className="generation-status__action"
        disabled={!canGenerate}
        onClick={onGenerate}
      >
        Generate Pattern
      </Button>
      <p className="form-help">
        {availability.available
          ? "Choose an image and complete all pattern settings to generate."
          : "Pattern generation is not available in this preview."}
      </p>
    </div>
  );
}
