import { describe, expect, it } from "vitest";

import {
  INITIAL_EMAIL_GATE_STATE,
  emailGateReducer,
} from "./email-gate-reducer";

describe("Email Gate reducer", () => {
  it("keeps challenge identity transient and clears it when email changes", () => {
    const issued = emailGateReducer(INITIAL_EMAIL_GATE_STATE, {
      type: "ISSUE_SUCCEEDED",
      challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
      resendAfterSeconds: 2,
    });
    expect(issued.phase).toBe("code-entry");
    expect(emailGateReducer(issued, { type: "TICK" }).resendAfterSeconds).toBe(
      1,
    );
    expect(emailGateReducer(issued, { type: "CHANGE_EMAIL" })).toEqual(
      INITIAL_EMAIL_GATE_STATE,
    );
  });
});
