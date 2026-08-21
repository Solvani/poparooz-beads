import { describe, expect, it } from "vitest";

import { createApprovedColorSetProvider } from "../../runtime/color-set";
import { findRequiredApprovedBeadSet } from "./required-bead-set";

describe("findRequiredApprovedBeadSet", () => {
  it.each([
    ["A4", 24],
    ["A10", 48],
    ["A3", 72],
    ["A1", 120],
    ["A2", 168],
    ["A20", 221],
  ] as const)(
    "selects the smallest approved profile covering %s",
    (code, size) => {
      expect(findRequiredApprovedBeadSet([code])).toMatchObject({ size });
    },
  );

  it("requires one approved profile to cover every final code", () => {
    expect(findRequiredApprovedBeadSet(["A4", "A10"])).toMatchObject({
      size: 48,
    });
    expect(findRequiredApprovedBeadSet(["A4", "A20"])).toMatchObject({
      size: 221,
    });
  });

  it("uses approved ascending order rather than input code order", () => {
    expect(findRequiredApprovedBeadSet(["A10", "A4"])).toMatchObject({
      profileId: "poparooz-set-48",
      size: 48,
    });
  });

  it("fails safely for empty or unknown code sets", () => {
    expect(findRequiredApprovedBeadSet([])).toBeNull();
    expect(findRequiredApprovedBeadSet(["UNKNOWN"])).toBeNull();
  });

  it("is deterministic for duplicates and does not mutate memberships", () => {
    const snapshot = createApprovedColorSetProvider().getSnapshot();
    const before = JSON.stringify(snapshot);

    expect(findRequiredApprovedBeadSet(["A10", "A4", "A10"])).toEqual(
      findRequiredApprovedBeadSet(["A4", "A10"]),
    );
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(Object.isFrozen(snapshot.profiles)).toBe(true);
  });
});
