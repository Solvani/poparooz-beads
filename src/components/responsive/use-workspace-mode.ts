import { useEffect, useRef, useState } from "react";

import { getWorkspaceMode, type WorkspaceMode } from "./workspace-mode";

interface WorkspaceResizeObserver {
  observe(target: Element): void;
  disconnect(): void;
}

export type WorkspaceResizeObserverFactory = (
  callback: ResizeObserverCallback,
) => WorkspaceResizeObserver;

export interface WorkspaceModeEnvironment {
  readonly createResizeObserver?: WorkspaceResizeObserverFactory | null;
  readonly initialWidth?: number;
}

export function useWorkspaceMode(environment: WorkspaceModeEnvironment = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<WorkspaceMode>(() =>
    getWorkspaceMode(environment.initialWidth ?? safeWindowWidth()),
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const update = (width: number) => {
      if (Number.isFinite(width) && width >= 0) {
        setMode(getWorkspaceMode(toViewportEquivalentWidth(width)));
      }
    };
    const measure = () => update(container.clientWidth || safeWindowWidth());

    measure();
    const factory =
      environment.createResizeObserver === undefined
        ? defaultResizeObserverFactory()
        : environment.createResizeObserver;
    if (factory) {
      const observer = factory((entries) => {
        const entry = entries.find(
          (candidate) => candidate.target === container,
        );
        if (entry) update(entry.contentRect.width);
      });
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [environment.createResizeObserver]);

  return { containerRef, mode } as const;
}

function safeWindowWidth(): number {
  return typeof window === "undefined" ? 1100 : window.innerWidth;
}

function toViewportEquivalentWidth(containerWidth: number): number {
  if (typeof document === "undefined") return containerWidth;

  const viewportWidth = safeWindowWidth();
  const documentWidth = document.documentElement.clientWidth;
  const verticalScrollbarWidth =
    documentWidth > 0 ? Math.max(0, viewportWidth - documentWidth) : 0;

  return containerWidth + verticalScrollbarWidth;
}

function defaultResizeObserverFactory(): WorkspaceResizeObserverFactory | null {
  if (typeof ResizeObserver === "undefined") return null;
  return (callback) => new ResizeObserver(callback);
}
