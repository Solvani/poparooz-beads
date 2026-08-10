import { describe, expect, it } from "vitest";

import approvedArtifact from "./artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json";
import { createApprovedColorSetProvider } from "./approved-color-set";
import { ColorSetBrowserError } from "./color-set.errors";
import { createColorSetProvider } from "./color-set.provider";

describe("approved Color Set Provider", () => {
  it("exposes exactly six deeply immutable published profiles", () => {
    const provider = createApprovedColorSetProvider();
    const snapshot = provider.getSnapshot();
    expect(snapshot.profiles.map((profile) => profile.size)).toEqual([
      24, 48, 72, 120, 168, 221,
    ]);
    expect(snapshot.groups.map((group) => group.memberCodes.length)).toEqual([
      24, 24, 24, 24, 24, 24, 24, 24, 29,
    ]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.groups[0]?.memberCodes)).toBe(true);
    expect(Object.isFrozen(snapshot.profiles[0]?.memberCodes)).toBe(true);
  });

  it.each([
    "poparooz-set-96",
    "poparooz-set-144",
    "poparooz-set-192",
    "unknown-profile",
  ])("rejects unsupported profile %s without fallback", (profileId) => {
    expect(() =>
      createApprovedColorSetProvider().selectPublishedProfile(profileId),
    ).toThrowError(ColorSetBrowserError);
  });

  it("strictly rejects enriched or partial Artifacts", () => {
    const enriched = structuredClone(approvedArtifact) as Record<
      string,
      unknown
    >;
    enriched.sourceWorkbookSha256 = "internal";
    expect(() => createColorSetProvider(enriched)).toThrowError(
      ColorSetBrowserError,
    );
    expect(() => createColorSetProvider({})).toThrowError(ColorSetBrowserError);
  });
});
