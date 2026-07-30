import {
  MOBILE_PANEL_LABELS,
  MOBILE_PANELS,
  type MobilePanel,
} from "./mobile-panel.types";

export interface MobilePanelLaunchersProps {
  readonly onOpen: (panel: MobilePanel, opener: HTMLButtonElement) => void;
}

export function MobilePanelLaunchers({ onOpen }: MobilePanelLaunchersProps) {
  return (
    <nav className="mobile-panel-launchers" aria-label="Pattern detail panels">
      {MOBILE_PANELS.map((panel) => (
        <button
          key={panel}
          type="button"
          className="mobile-panel-launcher"
          onClick={(event) => onOpen(panel, event.currentTarget)}
        >
          <span>{MOBILE_PANEL_LABELS[panel]}</span>
          <span aria-hidden="true">›</span>
        </button>
      ))}
    </nav>
  );
}
