import { describe, expect, it } from "vitest";

import { TEST_BOARD_PROFILE } from "./board-profile.fixture";
import {
  parseBoardProfile,
  safeParseBoardProfile,
} from "./board-profile.validation";

function expectBoardIssue(
  input: unknown,
  expectedPath: string,
  expectedReason: string,
): void {
  const result = safeParseBoardProfile(input);

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected board validation to fail.");
  }

  expect(
    result.error.issues.some(
      (issue) =>
        issue.path.join(".") === expectedPath &&
        issue.message.includes(expectedReason),
    ),
    JSON.stringify(result.error.issues),
  ).toBe(true);
}

describe("BoardProfile", () => {
  it("parses the valid non-production board fixture", () => {
    expect(parseBoardProfile(TEST_BOARD_PROFILE)).toEqual(TEST_BOARD_PROFILE);
  });

  it.each([
    ["columns", 0],
    ["columns", -1],
    ["rows", 0],
    ["rows", -1],
  ] as const)("rejects %s when it is %s", (field, value) => {
    expectBoardIssue(
      { ...TEST_BOARD_PROFILE, [field]: value },
      field,
      "positive integer",
    );
  });

  it.each(["columns", "rows"] as const)("rejects non-integer %s", (field) => {
    expectBoardIssue(
      { ...TEST_BOARD_PROFILE, [field]: 10.5 },
      field,
      "positive integer",
    );
  });

  it.each([
    [0, "positive"],
    [-1, "positive"],
    [Number.POSITIVE_INFINITY, "finite"],
  ] as const)("rejects beadSizeMm value %s", (value, reason) => {
    expectBoardIssue(
      { ...TEST_BOARD_PROFILE, beadSizeMm: value },
      "beadSizeMm",
      reason,
    );
  });
});
