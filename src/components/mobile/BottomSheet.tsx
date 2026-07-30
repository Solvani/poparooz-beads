import {
  useEffect,
  useId,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { BottomSheetTabs } from "./BottomSheetTabs";
import { MOBILE_PANEL_LABELS, type MobilePanel } from "./mobile-panel.types";

export const BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD = 96;

export interface BottomSheetProps {
  readonly activePanel: MobilePanel;
  readonly onPanelChange: (panel: MobilePanel) => void;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function BottomSheet({
  activePanel,
  onPanelChange,
  onClose,
  children,
}: BottomSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropPointerRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    target: HTMLDivElement;
  } | null>(null);

  useEffect(() => {
    const background = document.querySelector<HTMLElement>(".app-root");
    const previousAriaHidden = background?.getAttribute("aria-hidden") ?? null;
    const previouslyInert = background?.hasAttribute("inert") ?? false;
    const bodyStyle = document.body.getAttribute("style");
    const scrollY = window.scrollY;

    background?.setAttribute("inert", "");
    background?.setAttribute("aria-hidden", "true");
    Object.assign(document.body.style, {
      position: "fixed",
      overflow: "hidden",
      top: `-${scrollY}px`,
      width: "100%",
    });
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (background) {
        if (previousAriaHidden === null)
          background.removeAttribute("aria-hidden");
        else background.setAttribute("aria-hidden", previousAriaHidden);
        if (!previouslyInert) background.removeAttribute("inert");
      }
      if (bodyStyle === null) document.body.removeAttribute("style");
      else document.body.setAttribute("style", bodyStyle);
      window.scrollTo(0, scrollY);
      const drag = dragRef.current;
      if (drag) {
        try {
          drag.target.releasePointerCapture(drag.pointerId);
        } catch {
          // Pointer capture may already have been released by the browser.
        }
      }
      dragRef.current = null;
    };
  }, [onClose]);

  const resetDrag = (target?: Element, pointerId?: number) => {
    sheetRef.current?.style.removeProperty("--sheet-translate-y");
    if (target instanceof Element && pointerId !== undefined) {
      try {
        (target as HTMLElement).releasePointerCapture(pointerId);
      } catch {
        // Pointer capture may already have been released by the browser.
      }
    }
    dragRef.current = null;
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      target: event.currentTarget,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      dragRef.current = null;
    }
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - drag.startY);
    sheetRef.current?.style.setProperty("--sheet-translate-y", `${distance}px`);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - drag.startY);
    resetDrag(event.currentTarget, event.pointerId);
    if (distance >= BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD) onClose();
  };

  return createPortal(
    <div
      className="bottom-sheet-backdrop"
      onPointerDown={(event) => {
        backdropPointerRef.current =
          event.target === event.currentTarget ? event.pointerId : null;
      }}
      onPointerUp={(event) => {
        if (
          event.target === event.currentTarget &&
          backdropPointerRef.current === event.pointerId
        ) {
          onClose();
        }
        backdropPointerRef.current = null;
      }}
    >
      <div
        ref={dialogRef}
        className="bottom-sheet-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div ref={sheetRef} className="bottom-sheet">
          <div
            className="bottom-sheet__drag-handle"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={(event) =>
              resetDrag(event.currentTarget, event.pointerId)
            }
          >
            <span className="visually-hidden">Drag down to close</span>
          </div>
          <header className="bottom-sheet__header">
            <h2 id={titleId}>{MOBILE_PANEL_LABELS[activePanel]}</h2>
            <button
              ref={closeRef}
              type="button"
              className="button button--tertiary"
              onClick={onClose}
            >
              Close
            </button>
          </header>
          <BottomSheetTabs activePanel={activePanel} onChange={onPanelChange} />
          <div
            className="bottom-sheet__content"
            role="tabpanel"
            id={`bottom-sheet-panel-${activePanel}`}
            aria-labelledby={`bottom-sheet-tab-${activePanel}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
}
