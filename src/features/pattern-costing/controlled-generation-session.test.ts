import { describe, expect, it, vi } from "vitest";

import { createControlledGenerationEvidenceEvent } from "./controlled-generation-evidence";
import type { ControlledGenerationSession } from "./controlled-generation-session";
import {
  ControlledGenerationOperatorRuntime,
  PATTERN_COSTING_SEMANTIC_AUTHORITY,
} from "./controlled-generation-operator-runtime";
import { createPatternCostingExportV21 } from "./pattern-costing-export";
import {
  ASSERTION_ID,
  ATTEMPT_ID,
  MANIFEST,
  manifestBytes,
  successState,
} from "./test-fixtures";

const FIXED_TIME = "2026-09-22T00:00:00Z";

async function session() {
  const runtime = new ControlledGenerationOperatorRuntime();
  const controlled = await runtime.createSession(
    manifestBytes({
      ...MANIFEST,
      expectedGeneratorImplementationAuthorityId:
        PATTERN_COSTING_SEMANTIC_AUTHORITY,
    }),
    ASSERTION_ID,
    { now: () => FIXED_TIME },
  );
  return {
    authority: controlled.authority,
    session: controlled,
  };
}

async function eventTypes(controlled: ControlledGenerationSession) {
  return (await controlled.exportEvidence()).events.map(
    (event) => event.eventType,
  );
}

describe("ControlledGenerationSession", () => {
  it("consumes an external attempt exactly once and requests new authority", async () => {
    const { session: controlled } = await session();
    const first = controlled.consumeAttempt(false);
    expect(first.accepted).toBe(true);
    await first.evidenceReady;

    const second = controlled.consumeAttempt(false);
    expect(second.accepted).toBe(false);
    await second.evidenceReady;
    expect(await eventTypes(controlled)).toEqual([
      "GENERATION_STARTED",
      "RETRY_AUTHORITY_REQUIRED",
    ]);
  });

  it.each([
    ["failed", ["GENERATION_STARTED", "FAILED", "RETRY_AUTHORITY_REQUIRED"]],
    ["aborted", ["GENERATION_STARTED", "ABORTED", "RETRY_AUTHORITY_REQUIRED"]],
    [
      "dirty",
      ["GENERATION_STARTED", "INPUT_DIRTY", "RETRY_AUTHORITY_REQUIRED"],
    ],
  ] as const)(
    "records the %s terminal path in order",
    async (path, expected) => {
      const { session: controlled } = await session();
      await controlled.consumeAttempt(false).evidenceReady;
      if (path === "failed") await controlled.recordFailed("worker-failed");
      if (path === "aborted") await controlled.recordAborted();
      if (path === "dirty") await controlled.recordInputDirty();
      expect(await eventTypes(controlled)).toEqual(expected);
      expect(controlled.consumeAttempt(false).accepted).toBe(false);
    },
  );

  it("correlates a successful frozen V2.1 artifact without embedding its pattern", async () => {
    const { authority, session: controlled } = await session();
    await controlled.consumeAttempt(false).evidenceReady;
    const artifact = await createPatternCostingExportV21(
      successState(authority),
      {
        exportId: "018f3b71-6f14-7d42-9e8a-3b2e179a8c99",
        exportedAt: FIXED_TIME,
      },
    );
    const mismatchedArtifact = {
      ...artifact,
      payload: {
        ...artifact.payload,
        generationAttempt: {
          ...artifact.payload.generationAttempt,
          generationAttemptId: "018f3b71-6f14-7d42-9e8a-3b2e179a8d99",
        },
      },
    } as typeof artifact;
    expect(() => controlled.recordSucceeded(mismatchedArtifact)).toThrow(
      "Controlled generation artifact authority is invalid.",
    );
    expect(await controlled.recordSucceeded(artifact)).toBe(true);

    const snapshot = await controlled.exportEvidence();
    expect(snapshot.events.map((event) => event.eventType)).toEqual([
      "GENERATION_STARTED",
      "SUCCEEDED",
    ]);
    expect(snapshot.events[1]?.artifact).toEqual({
      contractVersion: "2.1.0",
      exportId: artifact.payload.exportId,
      generationAttemptId: ATTEMPT_ID,
      finalSnapshotDigest: artifact.payload.snapshot.finalSnapshotDigest,
      payloadChecksum: artifact.payload.payloadChecksum,
    });
    expect(controlled.getSuccessfulArtifact()).toBe(artifact);
    expect(snapshot.serialized).not.toContain("patternMatrix");
    expect(snapshot.serialized).not.toContain("sourceImage");
  });

  it("records regeneration and stale callbacks against the external attempt", async () => {
    const { session: controlled } = await session();
    await controlled.consumeAttempt(true).evidenceReady;
    await controlled.recordStaleCallback("FAILURE");
    await controlled.recordFailed("unknown");
    await controlled.recordRegenerationIdle();
    const snapshot = await controlled.exportEvidence();
    expect(snapshot.events.map((event) => event.eventType)).toEqual([
      "GENERATION_STARTED",
      "REGENERATION_STARTED",
      "STALE_CALLBACK_REJECTED",
      "FAILED",
      "RETRY_AUTHORITY_REQUIRED",
      "REGENERATION_IDLE",
    ]);
    expect(snapshot.events[2]?.rejectedCallback).toBe("FAILURE");
    expect(
      snapshot.events.every(
        (event) => event.identity.generationAttemptId === ATTEMPT_ID,
      ),
    ).toBe(true);
  });

  it("returns immutable ordered evidence and deterministic SHA-256 checksums", async () => {
    const sink = { append: vi.fn() };
    const runtime = new ControlledGenerationOperatorRuntime();
    const controlled = await runtime.createSession(
      manifestBytes({
        ...MANIFEST,
        expectedGeneratorImplementationAuthorityId:
          PATTERN_COSTING_SEMANTIC_AUTHORITY,
      }),
      ASSERTION_ID,
      { evidenceSink: sink, now: () => FIXED_TIME },
    );
    await controlled.consumeAttempt(false).evidenceReady;
    const first = await controlled.exportEvidence();
    const second = await controlled.exportEvidence();
    expect(first.evidenceChecksum).toBe(second.evidenceChecksum);
    expect(first.evidenceChecksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(first.events[0]?.evidenceChecksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Object.isFrozen(first.events)).toBe(true);
    expect(Object.isFrozen(first.events[0]?.identity)).toBe(true);
    expect(sink.append).toHaveBeenCalledOnce();

    const event = first.events[0]!;
    const recreated = await createControlledGenerationEvidenceEvent(
      event.identity,
      event.sequence,
      {
        recordedAt: event.recordedAt,
        eventType: event.eventType,
      },
    );
    expect(recreated.evidenceChecksum).toBe(event.evidenceChecksum);
  });
});
