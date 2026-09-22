import { describe, expect, it } from "vitest";

import {
  PATTERN_COSTING_SEMANTIC_AUTHORITY,
  createControlledGenerationSession,
} from "./controlled-generation-operator-adapter";
import { ControlledGenerationOperatorRuntime } from "./controlled-generation-operator-runtime";
import { MANIFEST, ASSERTION_ID, manifestBytes } from "./test-fixtures";

describe("controlled generation operator adapter", () => {
  const authorizedManifest = () =>
    manifestBytes({
      ...MANIFEST,
      expectedGeneratorImplementationAuthorityId:
        PATTERN_COSTING_SEMANTIC_AUTHORITY,
    });

  it("binds the production interface to the frozen PatternCosting authority", async () => {
    const controlled = await createControlledGenerationSession(
      new ControlledGenerationOperatorRuntime(),
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

  it("consumes the same authority once across new sessions and adapter calls", async () => {
    const runtime = new ControlledGenerationOperatorRuntime();
    const first = await createControlledGenerationSession(
      runtime,
      authorizedManifest(),
      ASSERTION_ID,
    );
    expect(first.consumeAttempt(false).accepted).toBe(true);

    const second = await createControlledGenerationSession(
      runtime,
      authorizedManifest(),
      ASSERTION_ID,
    );
    expect(second.canStart()).toBe(false);
    const rejected = second.consumeAttempt(false);
    expect(rejected.accepted).toBe(false);
    await rejected.evidenceReady;
    expect(
      (await second.exportEvidence()).events.map((event) => event.eventType),
    ).toEqual(["RETRY_AUTHORITY_REQUIRED"]);
  });

  it("accepts a distinct authority in the same live operator runtime", async () => {
    const runtime = new ControlledGenerationOperatorRuntime();
    const first = await runtime.createSession(
      authorizedManifest(),
      ASSERTION_ID,
    );
    expect(first.consumeAttempt(false).accepted).toBe(true);

    const nextAssertionId = "018f3b71-6f14-7d42-9e8a-3b2e179a8d11";
    const nextAttemptId = "018f3b71-6f14-7d42-9e8a-3b2e179a8d12";
    const next = await runtime.createSession(
      manifestBytes({
        ...MANIFEST,
        expectedGeneratorImplementationAuthorityId:
          PATTERN_COSTING_SEMANTIC_AUTHORITY,
        entries: [
          {
            ...MANIFEST.entries[0]!,
            assertionId: nextAssertionId,
            generationAttemptId: nextAttemptId,
          },
        ],
      }),
      nextAssertionId,
    );
    expect(next.canStart()).toBe(true);
    expect(next.consumeAttempt(false).accepted).toBe(true);
  });

  it("fails closed instead of substituting the current repository HEAD", async () => {
    await expect(
      createControlledGenerationSession(
        new ControlledGenerationOperatorRuntime(),
        manifestBytes(),
        ASSERTION_ID,
      ),
    ).rejects.toMatchObject({
      code: "QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MISMATCH",
    });
  });
});
