import type { ButtonVariant } from "../../components/ui/Button";
import { Button } from "../../components/ui/Button";

export interface PatternActionButtonProps {
  readonly enabled: boolean;
  readonly label: string;
  readonly note: string;
  readonly variant: ButtonVariant;
  readonly busy?: boolean;
  readonly onClick?: () => void;
}

export function PatternActionButton({
  enabled,
  label,
  note,
  variant,
  busy = false,
  onClick,
}: PatternActionButtonProps) {
  return (
    <div className="pattern-action">
      <Button
        className="pattern-action__button"
        disabled={!enabled || busy}
        variant={variant}
        aria-busy={busy || undefined}
        onClick={onClick}
      >
        {busy ? "Preparing Download…" : label}
      </Button>
      <span className="pattern-action__note">{note}</span>
    </div>
  );
}
