import { createApprovedColorSetProvider } from "../../runtime/color-set";
import type { PublishedColorSetProfile } from "../../runtime/color-set";

export interface RequiredBeadSetResult {
  readonly profileId: PublishedColorSetProfile["profileId"];
  readonly size: PublishedColorSetProfile["size"];
  readonly label: string;
}

const APPROVED_PROFILES =
  createApprovedColorSetProvider().getSnapshot().profiles;

export function findRequiredApprovedBeadSet(
  usedCodes: readonly string[],
): RequiredBeadSetResult | null {
  return findRequiredBeadSet(usedCodes, APPROVED_PROFILES);
}

export function findRequiredBeadSet(
  usedCodes: readonly string[],
  profiles: readonly PublishedColorSetProfile[],
): RequiredBeadSetResult | null {
  if (usedCodes.length === 0) return null;
  const requiredCodes = new Set(usedCodes);
  const ascending = [...profiles].sort((left, right) => left.size - right.size);
  for (const profile of ascending) {
    const members = new Set(profile.memberCodes);
    if ([...requiredCodes].every((code) => members.has(code))) {
      return Object.freeze({
        profileId: profile.profileId,
        size: profile.size,
        label: `${profile.size}-Color Set`,
      });
    }
  }
  return null;
}
