import type { ButtonVariant } from "../../components/ui/Button";
import { Button } from "../../components/ui/Button";

export interface PatternActionButtonProps {
  readonly enabled: boolean;
  readonly label: string;
  readonly variant: ButtonVariant;
}

export function PatternActionButton({
  enabled,
  label,
  variant,
}: PatternActionButtonProps) {
  return (
    <div className="pattern-action">
      <Button
        className="pattern-action__button"
        disabled={!enabled}
        variant={variant}
      >
        {label}
      </Button>
      <span className="pattern-action__note">Coming later</span>
    </div>
  );
}
