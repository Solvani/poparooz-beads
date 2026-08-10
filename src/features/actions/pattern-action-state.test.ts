import { describe, expect, it } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import type {
  CurrentGeneratorInput,
  GeneratorState,
  LastGenerationSuccess,
} from "../generator/generator-state";
import type { GenerationInputSnapshot } from "../generator/generation.types";
import {
  PRODUCTION_PATTERN_ACTION_CAPABILITIES,
  toPatternActionState,
} from "./pattern-action-state";

function snapshot(jobId = 1): GenerationInputSnapshot {
  return {
    jobId,
    file: new File(["image"], "photo.png", { type: "image/png" }),
    imageVersion: 1,
    settings: {
      width: 32,
      height: 24,
      maxColors: 16,
      background: "white",
      selectedColorSetProfileId: "poparooz-set-221",
    },
    inputKey: `input-${jobId}`,
  };
}

function input(job = snapshot()): CurrentGeneratorInput {
  return { imageVersion: job.imageVersion, candidate: job };
}

function success(
  jobId = 1,
  result = createPublicPattern(),
): LastGenerationSuccess {
  return { snapshot: snapshot(jobId), result };
}

function withPrevious(
  status: "dirty" | "regenerating" | "aborted" | "error",
): GeneratorState {
  const lastSuccess = success();
  const current = input(snapshot(2));
  switch (status) {
    case "dirty":
      return { status, input: current, lastSuccess };
    case "regenerating":
      return { status, input: current, job: snapshot(2), lastSuccess };
    case "aborted":
      return { status, input: current, lastSuccess };
    case "error":
      return {
        status,
        input: current,
        lastSuccess,
        error: { code: "unknown", message: "Safe message" },
      };
  }
}

describe("toPatternActionState", () => {
  it.each<GeneratorState>([
    { status: "idle" },
    { status: "image-loaded", input: input() },
    { status: "processing", input: input(), job: snapshot() },
    { status: "aborted", input: input() },
    {
      status: "error",
      input: input(),
      error: { code: "unknown", message: "Safe message" },
    },
  ])("keeps $status unassociated with a result", (state) => {
    expect(toPatternActionState(state)).toEqual({
      hasResult: false,
      resultIdentity: null,
      resultScope: "none",
      downloadEnabled: false,
      getBeadsEnabled: false,
      availabilityMessage:
        "Create a pattern to access download and bead options.",
      scopeMessage: null,
    });
  });

  it("associates success with the current successful result", () => {
    const state: GeneratorState = {
      status: "success",
      input: input(),
      lastSuccess: success(7),
    };

    expect(toPatternActionState(state)).toMatchObject({
      hasResult: true,
      resultIdentity: 7,
      resultScope: "current-result",
      downloadEnabled: false,
      getBeadsEnabled: false,
      availabilityMessage:
        "Download and bead options are not available in this preview.",
      scopeMessage: null,
    });
  });

  it.each([
    ["dirty", "These actions apply to your previous pattern."],
    [
      "regenerating",
      "Your previous pattern remains available while the update is processing.",
    ],
    [
      "aborted",
      "Pattern update stopped. These actions still apply to your previous pattern.",
    ],
    [
      "error",
      "Pattern update failed. These actions still apply to your previous pattern.",
    ],
  ] as const)(
    "keeps %s associated with the previous result",
    (status, message) => {
      expect(toPatternActionState(withPrevious(status))).toMatchObject({
        hasResult: true,
        resultIdentity: 1,
        resultScope: "previous-result",
        scopeMessage: message,
      });
    },
  );

  it("changes identity only when a new successful result is displayed", () => {
    const first: GeneratorState = {
      status: "success",
      input: input(),
      lastSuccess: success(1),
    };
    const second: GeneratorState = {
      status: "success",
      input: input(snapshot(2)),
      lastSuccess: success(2),
    };

    expect(toPatternActionState(first).resultIdentity).toBe(1);
    expect(
      toPatternActionState(withPrevious("regenerating")).resultIdentity,
    ).toBe(1);
    expect(toPatternActionState(second).resultIdentity).toBe(2);
    expect(toPatternActionState({ status: "idle" }).resultIdentity).toBeNull();
  });

  it("enables only an available capability backed by a result", () => {
    const state: GeneratorState = {
      status: "success",
      input: input(),
      lastSuccess: success(),
    };

    expect(
      toPatternActionState(state, {
        downloadPattern: true,
        getBeads: false,
      }),
    ).toMatchObject({ downloadEnabled: true, getBeadsEnabled: false });
    expect(
      toPatternActionState(
        { status: "idle" },
        {
          downloadPattern: true,
          getBeads: true,
        },
      ),
    ).toMatchObject({ downloadEnabled: false, getBeadsEnabled: false });
  });

  it("does not mutate the state or result and never reads the pattern matrix", () => {
    const base = createPublicPattern();
    let matrixReads = 0;
    const guardedResult = Object.defineProperty({ ...base }, "matrix", {
      enumerable: true,
      get() {
        matrixReads += 1;
        throw new Error("Matrix must not be read");
      },
    }) as PublicPatternResult;
    const lastSuccess = success(3, guardedResult);
    const state: GeneratorState = {
      status: "success",
      input: input(),
      lastSuccess,
    };

    expect(toPatternActionState(state).resultIdentity).toBe(3);
    expect(matrixReads).toBe(0);
    expect(state.lastSuccess).toBe(lastSuccess);
    expect(state.lastSuccess.result).toBe(guardedResult);
  });

  it("keeps both production capabilities frozen and unavailable", () => {
    expect(PRODUCTION_PATTERN_ACTION_CAPABILITIES).toEqual({
      downloadPattern: false,
      getBeads: false,
    });
    expect(Object.isFrozen(PRODUCTION_PATTERN_ACTION_CAPABILITIES)).toBe(true);
  });
});
