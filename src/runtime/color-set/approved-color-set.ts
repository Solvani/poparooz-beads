import approvedArtifact from "./artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json";
import { createColorSetProvider } from "./color-set.provider";

export function createApprovedColorSetProvider() {
  return createColorSetProvider(approvedArtifact);
}
