import { describe, expect, it } from "vitest";

import { createApprovedColorSetProvider } from "../../runtime/color-set";
import { recommendApprovedColorSet } from "./recommended-color-set";

describe("recommendApprovedColorSet", () => {
  it.each([
    ["A4", 24],
    ["A10", 48],
    ["A3", 72],
    ["A1", 120],
    ["A2", 168],
    ["A20", 221],
  ] as const)(
    "selects the smallest published profile covering %s",
    (code, size) => {
      expect(recommendApprovedColorSet([code])).toMatchObject({ size });
    },
  );

  it("requires one published membership to cover every actual code", () => {
    expect(recommendApprovedColorSet(["A4", "A10"])).toMatchObject({
      size: 48,
    });
    expect(recommendApprovedColorSet(["A4", "A20"])).toMatchObject({
      size: 221,
    });
  });

  it("fails safely for empty or unknown code sets", () => {
    expect(recommendApprovedColorSet([])).toBeNull();
    expect(recommendApprovedColorSet(["UNKNOWN"])).toBeNull();
  });

  it("is deterministic and does not mutate approved memberships", () => {
    const snapshot = createApprovedColorSetProvider().getSnapshot();
    const before = JSON.stringify(snapshot);

    expect(recommendApprovedColorSet(["A10", "A4", "A10"])).toEqual(
      recommendApprovedColorSet(["A4", "A10"]),
    );
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(Object.isFrozen(snapshot.profiles)).toBe(true);
  });
});
