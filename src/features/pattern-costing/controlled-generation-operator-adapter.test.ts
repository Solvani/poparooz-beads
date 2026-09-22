import { describe, expect, it } from "vitest";

import {
  PATTERN_COSTING_SEMANTIC_AUTHORITY,
  createControlledGenerationSession,
} from "./controlled-generation-operator-adapter";
import { MANIFEST, ASSERTION_ID, manifestBytes } from "./test-fixtures";

describe("controlled generation operator adapter", () => {
  it("binds the production interface to the frozen PatternCosting authority", async () => {
    const controlled = await createControlledGenerationSession(
      manifestBytes({
        ...MANIFEST,
        expectedGeneratorImplementationAuthorityId:
          PATTERN_COSTING_SEMANTIC_AUTHORITY,
      }),
      ASSERTION_ID,
    );
    expect(controlled.authority.generatorImplementationAuthorityId).toBe(
      "git:a0005ecf885db2d458679b20ec7c6006d7b12b79",
    );
    expect(controlled.authority.assertion).toMatchObject({
      assertionId: ASSERTION_ID,
      generationAttemptId: MANIFEST.entries[0]!.generationAttemptId,
      batchId: MANIFEST.batchId,
      productKey: MANIFEST.entries[0]!.productKey,
      targetTableId: MANIFEST.targetTableId,
      targetRecordId: MANIFEST.entries[0]!.targetRecordId,
    });
  });

  it("fails closed instead of substituting the current repository HEAD", async () => {
    await expect(
      createControlledGenerationSession(manifestBytes(), ASSERTION_ID),
    ).rejects.toMatchObject({
      code: "QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MISMATCH",
    });
  });
});
