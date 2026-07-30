export const MOBILE_PANELS = [
  "settings",
  "colors",
  "boards",
  "original",
] as const;

export type MobilePanel = (typeof MOBILE_PANELS)[number];

export const MOBILE_PANEL_LABELS: Record<MobilePanel, string> = {
  settings: "Settings",
  colors: "Colors",
  boards: "Boards",
  original: "Original",
};
