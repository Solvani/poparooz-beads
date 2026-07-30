import { useCallback, useEffect, useRef, useState } from "react";

import type { MobilePanel } from "./mobile-panel.types";

export function useBottomSheet() {
  const [activePanel, setActivePanel] = useState<MobilePanel | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const isOpenRef = useRef(false);
  const restoreFrameRef = useRef<number | null>(null);

  const open = useCallback((panel: MobilePanel, opener: HTMLButtonElement) => {
    if (restoreFrameRef.current !== null) {
      cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
    openerRef.current = opener;
    isOpenRef.current = true;
    setActivePanel(panel);
  }, []);

  const close = useCallback(() => {
    if (!isOpenRef.current) return;
    isOpenRef.current = false;
    setActivePanel(null);
    restoreFrameRef.current = requestAnimationFrame(() => {
      restoreFrameRef.current = null;
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    });
  }, []);

  useEffect(
    () => () => {
      if (restoreFrameRef.current !== null) {
        cancelAnimationFrame(restoreFrameRef.current);
      }
    },
    [],
  );

  return {
    activePanel,
    isOpen: activePanel !== null,
    open,
    close,
    setActivePanel,
  } as const;
}
