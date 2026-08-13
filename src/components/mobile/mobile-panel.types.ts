export const MOBILE_PANELS = ["settings", "original"] as const;

export type MobilePanel = (typeof MOBILE_PANELS)[number];

export const MOBILE_PANEL_LABELS: Record<MobilePanel, string> = {
  settings: "Settings",
  original: "Original",
};
