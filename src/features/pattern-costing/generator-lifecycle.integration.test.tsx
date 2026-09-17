import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type {
  GenerationInputSnapshot,
  GenerationRuntime,
} from "../generator/generation.types";
import { useGeneratorController } from "../generator/use-generator-controller";
import type { PatternSettingsDraft } from "../settings/settings.types";
import { bindControlledGenerationManifest } from "./manifest";
import {
  ASSERTION_ID,
  ATTEMPT_ID,
  IMPLEMENTATION_AUTHORITY,
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
    const authority = await bindControlledGenerationManifest(manifestBytes(), {
      assertionId: ASSERTION_ID,
      acceptedGeneratorImplementationAuthorityId: IMPLEMENTATION_AUTHORITY,
    });
    const file = new File(["image"], "synthetic.png", {
      type: "image/png",
    });
    const { result } = renderHook(() =>
      useGeneratorController({
        file,
        imageVersion: 1,
        settings: SETTINGS,
        runtime,
        patternCosting: { mode: "controlled", authority },
      }),
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => expect(result.current.generate()).toBe(true));
    expect(result.current.state.status).toBe("processing");
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
          authority: undefined as never,
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
});
