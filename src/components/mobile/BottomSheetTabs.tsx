import { useRef } from "react";

import {
  MOBILE_PANEL_LABELS,
  MOBILE_PANELS,
  type MobilePanel,
} from "./mobile-panel.types";

export interface BottomSheetTabsProps {
  readonly activePanel: MobilePanel;
  readonly onChange: (panel: MobilePanel) => void;
}

export function BottomSheetTabs({
  activePanel,
  onChange,
}: BottomSheetTabsProps) {
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (index: number) => {
    const panel = MOBILE_PANELS[index];
    if (!panel) return;
    onChange(panel);
    tabsRef.current[index]?.focus();
  };

  return (
    <div
      className="bottom-sheet-tabs"
      role="tablist"
      aria-label="Pattern panels"
    >
      {MOBILE_PANELS.map((panel, index) => (
        <button
          key={panel}
          ref={(element) => {
            tabsRef.current[index] = element;
          }}
          type="button"
          role="tab"
          id={`bottom-sheet-tab-${panel}`}
          aria-selected={activePanel === panel}
          aria-controls={`bottom-sheet-panel-${panel}`}
          tabIndex={activePanel === panel ? 0 : -1}
          onClick={() => onChange(panel)}
          onKeyDown={(event) => {
            const currentIndex = MOBILE_PANELS.indexOf(activePanel);
            if (event.key === "ArrowRight") {
              event.preventDefault();
              select((currentIndex + 1) % MOBILE_PANELS.length);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              select(
                (currentIndex - 1 + MOBILE_PANELS.length) %
                  MOBILE_PANELS.length,
              );
            } else if (event.key === "Home") {
              event.preventDefault();
              select(0);
            } else if (event.key === "End") {
              event.preventDefault();
              select(MOBILE_PANELS.length - 1);
            }
          }}
        >
          {MOBILE_PANEL_LABELS[panel]}
        </button>
      ))}
    </div>
  );
}
