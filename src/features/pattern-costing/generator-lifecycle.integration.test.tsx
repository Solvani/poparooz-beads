import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type {
  GenerationInputSnapshot,
  GenerationRuntime,
} from "../generator/generation.types";
import { useGeneratorController } from "../generator/use-generator-controller";
import type { PatternSettingsDraft } from "../settings/settings.types";
import type { ControlledGenerationSession } from "./controlled-generation-session";
import {
  ControlledGenerationOperatorRuntime,
  PATTERN_COSTING_SEMANTIC_AUTHORITY,
} from "./controlled-generation-operator-runtime";
import {
  ASSERTION_ID,
  ATTEMPT_ID,
  MANIFEST,
  RUNTIME_AUTHORITY,
  allA1Pattern,
  manifestBytes,
} from "./test-fixtures";

const SETTINGS: PatternSettingsDraft = {
  width: "40",
  height: "40",
  maxColors: "16",
  background: "white",
  selectedColorSetProfileId: "poparooz-set-221",
};

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function queuedRuntime(tasks: readonly Deferred<PublicPatternResult>[]) {
  let index = 0;
  const generate = vi.fn(() => tasks[index++]!.promise);
  const runtime: GenerationRuntime = {
    availability: { available: true },
    service: { generate },
    colorSetProfiles: [{ profileId: "poparooz-set-221", size: 221 }],
    patternCostingRuntimeAuthorities: [RUNTIME_AUTHORITY],
  };
  return { runtime, generate };
}

async function controlledSession(
  assertionId = ASSERTION_ID,
  generationAttemptId = ATTEMPT_ID,
) {
  const manifest = {
    ...MANIFEST,
    entries: [
      {
        ...MANIFEST.entries[0]!,
        assertionId,
        generationAttemptId,
      },
    ],
  };
  return new ControlledGenerationOperatorRuntime().createSession(
    manifestBytes({
      ...manifest,
      expectedGeneratorImplementationAuthorityId:
        PATTERN_COSTING_SEMANTIC_AUTHORITY,
    }),
    assertionId,
  );
}

async function evidenceTypes(session: ControlledGenerationSession) {
  return (await session.exportEvidence()).events.map(
    (event) => event.eventType,
  );
}

describe("controlled PatternCosting generation lifecycle", () => {
  it("binds immutable external attempt authority before STARTED and keeps jobId separate", async () => {
    let resolve!: (value: PublicPatternResult) => void;
    const promise = new Promise<PublicPatternResult>((accept) => {
      resolve = accept;
    });
    const generate = vi.fn(
      (input: GenerationInputSnapshot, signal: AbortSignal) => {
        void input;
        void signal;
        return promise;
      },
    );
    const runtime: GenerationRuntime = {
      availability: { available: true },
      service: { generate },
      colorSetProfiles: [{ profileId: "poparooz-set-221", size: 221 }],
      patternCostingRuntimeAuthorities: [RUNTIME_AUTHORITY],
    };
    const session = await controlledSession();
    const file = new File(["image"], "synthetic.png", {
      type: "image/png",
    });
    const { result } = renderHook(() =>
      useGeneratorController({
        file,
        imageVersion: 1,
        settings: SETTINGS,
        runtime,
        patternCosting: { mode: "controlled", session },
      }),
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => expect(result.current.generate()).toBe(true));
    expect(result.current.state.status).toBe("processing");
    await waitFor(() => expect(generate).toHaveBeenCalledOnce());
    const snapshot = generate.mock.calls[0]![0];
    expect(
      snapshot.patternCosting?.authority.assertion.generationAttemptId,
    ).toBe(ATTEMPT_ID);
    expect(snapshot.jobId).toBe(1);
    expect(String(snapshot.jobId)).not.toBe(ATTEMPT_ID);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.patternCosting)).toBe(true);
    expect(Object.isFrozen(snapshot.patternCosting?.authority.manifest)).toBe(
      true,
    );
    await act(async () => resolve(allA1Pattern()));
    expect(result.current.state.status).toBe("success");
    if (result.current.state.status === "success") {
      expect(
        result.current.state.lastSuccess.snapshot.patternCosting?.authority
          .assertion.generationAttemptId,
      ).toBe(ATTEMPT_ID);
    }
    await waitFor(() => expect(session.getSuccessfulArtifact()).not.toBeNull());
    expect(await evidenceTypes(session)).toEqual([
      "GENERATION_STARTED",
      "SUCCEEDED",
    ]);
  });

  it("fails closed before service invocation when controlled authority is absent", async () => {
    const generate = vi.fn(
      async (input: GenerationInputSnapshot, signal: AbortSignal) => {
        void input;
        void signal;
        return allA1Pattern();
      },
    );
    const runtime: GenerationRuntime = {
      availability: { available: true },
      service: { generate },
      colorSetProfiles: [{ profileId: "poparooz-set-221", size: 221 }],
      patternCostingRuntimeAuthorities: [RUNTIME_AUTHORITY],
    };
    const file = new File(["image"], "synthetic.png");
    const { result } = renderHook(() =>
      useGeneratorController({
        file,
        imageVersion: 1,
        settings: SETTINGS,
        runtime,
        patternCosting: {
          mode: "controlled",
          session: undefined as never,
        },
      }),
    );
    await waitFor(() =>
      expect(result.current.state.status).toBe("image-loaded"),
    );
    expect(result.current.canGenerate).toBe(false);
    expect(result.current.generate()).toBe(false);
    expect(generate).not.toHaveBeenCalled();
  });

  it("blocks same-attempt retry after failure and emits safe lifecycle evidence", async () => {
    const task = deferred<PublicPatternResult>();
    const generation = queuedRuntime([task]);
    const session = await controlledSession();
    const file = new File(["image"], "synthetic.png");
    const { result } = renderHook(() =>
      useGeneratorController({
        file,
        imageVersion: 1,
        settings: SETTINGS,
        runtime: generation.runtime,
        patternCosting: { mode: "controlled", session },
      }),
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => expect(result.current.generate()).toBe(true));
    await waitFor(() => expect(generation.generate).toHaveBeenCalledOnce());
    await act(async () => task.reject(new Error("private raw failure")));
    expect(result.current.state.status).toBe("error");
    expect(result.current.generate()).toBe(false);
    expect(generation.generate).toHaveBeenCalledOnce();
    expect(await evidenceTypes(session)).toEqual([
      "GENERATION_STARTED",
      "FAILED",
      "RETRY_AUTHORITY_REQUIRED",
    ]);
    expect((await session.exportEvidence()).serialized).not.toContain(
      "private raw failure",
    );
  });

  it("keeps an aborted controlled attempt consumed", async () => {
    const task = deferred<PublicPatternResult>();
    const generation = queuedRuntime([task]);
    const session = await controlledSession();
    const file = new File(["image"], "synthetic.png");
    const { result } = renderHook(() =>
      useGeneratorController({
        file,
        imageVersion: 1,
        settings: SETTINGS,
        runtime: generation.runtime,
        patternCosting: { mode: "controlled", session },
      }),
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => expect(result.current.generate()).toBe(true));
    await waitFor(() => expect(generation.generate).toHaveBeenCalledOnce());
    act(() => expect(result.current.abort()).toBe(true));
    expect(result.current.state.status).toBe("aborted");
    expect(result.current.generate()).toBe(false);
    expect(await evidenceTypes(session)).toEqual([
      "GENERATION_STARTED",
      "ABORTED",
      "RETRY_AUTHORITY_REQUIRED",
    ]);
  });

  it("marks changed generation input dirty once and never hands off a false success", async () => {
    const task = deferred<PublicPatternResult>();
    const generation = queuedRuntime([task]);
    const session = await controlledSession();
    const file = new File(["image"], "synthetic.png");
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useGeneratorController({
          file,
          imageVersion: 1,
          settings,
          runtime: generation.runtime,
          patternCosting: { mode: "controlled", session },
        }),
      { initialProps: { settings: SETTINGS } },
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => expect(result.current.generate()).toBe(true));
    await waitFor(() => expect(generation.generate).toHaveBeenCalledOnce());
    rerender({ settings: { ...SETTINGS, maxColors: "20" } });
    await act(async () => task.resolve(allA1Pattern()));
    await waitFor(() => expect(result.current.state.status).toBe("dirty"));
    expect(session.getSuccessfulArtifact()).toBeNull();
    expect(await evidenceTypes(session)).toEqual([
      "GENERATION_STARTED",
      "INPUT_DIRTY",
      "RETRY_AUTHORITY_REQUIRED",
    ]);
  });

  it("accepts a new COST authority as regeneration without calling it input dirtiness", async () => {
    const first = deferred<PublicPatternResult>();
    const second = deferred<PublicPatternResult>();
    const generation = queuedRuntime([first, second]);
    const oldSession = await controlledSession();
    const newSession = await controlledSession(
      "018f3b71-6f14-7d42-9e8a-3b2e179a8d11",
      "018f3b71-6f14-7d42-9e8a-3b2e179a8d12",
    );
    const file = new File(["image"], "synthetic.png");
    const { result, rerender } = renderHook(
      ({ session }) =>
        useGeneratorController({
          file,
          imageVersion: 1,
          settings: SETTINGS,
          runtime: generation.runtime,
          patternCosting: { mode: "controlled", session },
        }),
      { initialProps: { session: oldSession } },
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => expect(result.current.generate()).toBe(true));
    await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
    await act(async () => first.resolve(allA1Pattern()));
    await waitFor(() =>
      expect(oldSession.getSuccessfulArtifact()).not.toBeNull(),
    );

    rerender({ session: newSession });
    await waitFor(() => expect(result.current.canRegenerate).toBe(true));
    act(() => expect(result.current.generate()).toBe(true));
    await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(2));
    await act(async () => second.resolve(allA1Pattern()));
    await waitFor(() =>
      expect(newSession.getSuccessfulArtifact()).not.toBeNull(),
    );
    expect(await evidenceTypes(oldSession)).toEqual([
      "GENERATION_STARTED",
      "SUCCEEDED",
    ]);
    expect(await evidenceTypes(newSession)).toEqual([
      "GENERATION_STARTED",
      "REGENERATION_STARTED",
      "SUCCEEDED",
      "REGENERATION_IDLE",
    ]);
  });

  it.each([
    ["SUCCESS" as const, true],
    ["FAILURE" as const, false],
  ])(
    "rejects a stale %s callback without disturbing the newer attempt",
    async (kind, succeeds) => {
      const first = deferred<PublicPatternResult>();
      const second = deferred<PublicPatternResult>();
      const generation = queuedRuntime([first, second]);
      const oldSession = await controlledSession();
      const newSession = await controlledSession(
        "018f3b71-6f14-7d42-9e8a-3b2e179a8e11",
        "018f3b71-6f14-7d42-9e8a-3b2e179a8e12",
      );
      const file = new File(["image"], "synthetic.png");
      const { result, rerender } = renderHook(
        ({ session }) =>
          useGeneratorController({
            file,
            imageVersion: 1,
            settings: SETTINGS,
            runtime: generation.runtime,
            patternCosting: { mode: "controlled", session },
          }),
        { initialProps: { session: oldSession } },
      );
      await waitFor(() => expect(result.current.canGenerate).toBe(true));
      act(() => expect(result.current.generate()).toBe(true));
      await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
      rerender({ session: newSession });
      act(() => expect(result.current.generate()).toBe(true));
      await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(2));

      if (succeeds) await act(async () => first.resolve(allA1Pattern()));
      else await act(async () => first.reject(new Error("stale failure")));
      expect(result.current.state.status).toBe("processing");
      await act(async () => second.resolve(allA1Pattern()));
      await waitFor(() =>
        expect(newSession.getSuccessfulArtifact()).not.toBeNull(),
      );
      expect(oldSession.getSuccessfulArtifact()).toBeNull();
      const oldEvidence = await oldSession.exportEvidence();
      expect(
        oldEvidence.events.filter(
          (event) => event.eventType === "STALE_CALLBACK_REJECTED",
        ),
      ).toHaveLength(1);
      expect(
        oldEvidence.events.find(
          (event) => event.eventType === "STALE_CALLBACK_REJECTED",
        )?.rejectedCallback,
      ).toBe(kind);
    },
  );
});
