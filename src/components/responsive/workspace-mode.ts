export type WorkspaceMode = "compact" | "medium" | "desktop";

export function getWorkspaceMode(width: number): WorkspaceMode {
  if (width < 768) return "compact";
  if (width < 1100) return "medium";
  return "desktop";
}
