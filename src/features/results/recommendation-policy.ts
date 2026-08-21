import type { PublishedColorSetProfile } from "../../runtime/color-set";
import type { RequiredBeadSetResult } from "./required-bead-set";

export const RECOMMENDATION_POLICY_ID =
  "poparooz-recommendation-policy" as const;
export const RECOMMENDATION_POLICY_VERSION = "1.0.0" as const;

export interface RecommendedBeadSetResult {
  readonly profileId: PublishedColorSetProfile["profileId"];
  readonly size: PublishedColorSetProfile["size"];
  readonly label: string;
  readonly policyId: typeof RECOMMENDATION_POLICY_ID;
  readonly policyVersion: typeof RECOMMENDATION_POLICY_VERSION;
}

export function recommendBeadSet({
  requiredBeadSet,
}: {
  readonly requiredBeadSet: RequiredBeadSetResult | null;
}): RecommendedBeadSetResult | null {
  if (requiredBeadSet === null) return null;
  return Object.freeze({
    profileId: requiredBeadSet.profileId,
    size: requiredBeadSet.size,
    label: requiredBeadSet.label,
    policyId: RECOMMENDATION_POLICY_ID,
    policyVersion: RECOMMENDATION_POLICY_VERSION,
  });
}
