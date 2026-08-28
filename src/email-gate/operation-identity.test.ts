import { describe, expect, it } from "vitest";

import { createEmailGateOperationIdentity } from "./operation-identity";

describe("Email Gate browser operation identity", () => {
  it("makes an out-of-order issuance response stale even if abort is ignored", () => {
    const issuance = createEmailGateOperationIdentity();
    const older = issuance.begin();
    const newer = issuance.begin();
    expect(issuance.isCurrent(older.generation)).toBe(false);
    expect(issuance.isCurrent(newer.generation)).toBe(true);
  });

  it("makes an out-of-order verification response stale", () => {
    const verification = createEmailGateOperationIdentity();
    const older = verification.begin();
    const newer = verification.begin();
    expect(verification.isCurrent(older.generation)).toBe(false);
    expect(verification.isCurrent(newer.generation)).toBe(true);
  });

  it("invalidates an in-flight operation on close or email change", () => {
    const operation = createEmailGateOperationIdentity();
    const current = operation.begin();
    operation.supersede();
    expect(current.signal.aborted).toBe(true);
    expect(operation.isCurrent(current.generation)).toBe(false);
  });
});
