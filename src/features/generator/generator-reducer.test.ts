import { describe, expect, it } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { PatternSettingsValue } from "../settings/settings.types";
import { generatorReducer } from "./generator-reducer";
import {
  INITIAL_GENERATOR_STATE,
  type CurrentGeneratorInput,
  type GeneratorState,
} from "./generator-state";
import type { GenerationInputSnapshot } from "./generation.types";

const SETTINGS: PatternSettingsValue = Object.freeze({
  width: 32,
  height: 24,
  maxColors: 16,
  background: "white",
  selectedColorSetProfileId: "poparooz-set-221",
});

function job(
  jobId = 1,
  inputKey = "1:32:24:16:white",
): GenerationInputSnapshot {
  return Object.freeze({
    jobId,
    file: new File(["image"], "photo.png", { type: "image/png" }),
    imageVersion: Number(inputKey.split(":")[0]),
    settings: SETTINGS,
    inputKey,
  });
}

function input(snapshot = job()): CurrentGeneratorInput {
  return {
    imageVersion: snapshot.imageVersion,
    candidate: snapshot,
  };
}

const RESULT = {
  matrix: {
    width: 1,
    height: 1,
    colorIndices: new Uint16Array([0]),
    transparentIndex: 65535,
  },
  colors: [],
  materials: [],
  totals: {
    width: 1,
    height: 1,
    totalPositions: 1,
    totalBeads: 1,
    transparentPositions: 0,
    colorCount: 0,
  },
  boardLayout: {
    boardColumns: 1,
    boardRows: 1,
    boardCount: 1,
    boardWidthInBeads: 1,
    boardHeightInBeads: 1,
    totalPegCapacity: 1,
    usedBeadCount: 1,
    transparentPatternPositions: 0,
    outsidePatternPegCount: 0,
    unusedPegCount: 0,
    tiles: [],
  },
} satisfies PublicPatternResult;

function firstSuccess(): GeneratorState {
  const snapshot = job();
  const loaded = generatorReducer(INITIAL_GENERATOR_STATE, {
    type: "INPUT_CHANGED",
    input: input(snapshot),
  });
  const processing = generatorReducer(loaded, {
    type: "STARTED",
    job: snapshot,
  });
  return generatorReducer(processing, {
    type: "SUCCEEDED",
    jobId: snapshot.jobId,
    result: RESULT,
  });
}

describe("generatorReducer", () => {
  it("moves from idle through image-loaded, processing, and success", () => {
    const snapshot = job();
    const loaded = generatorReducer(INITIAL_GENERATOR_STATE, {
      type: "INPUT_CHANGED",
      input: input(snapshot),
    });
    const processing = generatorReducer(loaded, {
      type: "STARTED",
      job: snapshot,
    });
    const success = generatorReducer(processing, {
      type: "SUCCEEDED",
      jobId: 1,
      result: RESULT,
    });

    expect(INITIAL_GENERATOR_STATE.status).toBe("idle");
    expect(loaded.status).toBe("image-loaded");
    expect(processing.status).toBe("processing");
    expect(success.status).toBe("success");
  });

  it("supports first-generation abort and safe failure without a result", () => {
    const snapshot = job();
    const loaded = generatorReducer(INITIAL_GENERATOR_STATE, {
      type: "INPUT_CHANGED",
      input: input(snapshot),
    });
    const processing = generatorReducer(loaded, {
      type: "STARTED",
      job: snapshot,
    });
    const aborted = generatorReducer(processing, { type: "ABORTED", jobId: 1 });
    const failed = generatorReducer(processing, {
      type: "FAILED",
      jobId: 1,
      error: { code: "unknown", message: "Safe message" },
    });

    expect(aborted).toMatchObject({ status: "aborted" });
    expect(failed).toMatchObject({
      status: "error",
      error: { message: "Safe message" },
    });
    expect("lastSuccess" in aborted).toBe(false);
  });

  it("marks changed settings or image identity dirty and can return to success", () => {
    const success = firstSuccess();
    const changed = job(2, "1:40:24:16:white");
    const dirty = generatorReducer(success, {
      type: "INPUT_CHANGED",
      input: input(changed),
    });
    const changedImage = generatorReducer(success, {
      type: "INPUT_CHANGED",
      input: input(job(2, "2:32:24:16:white")),
    });
    const restored = generatorReducer(dirty, {
      type: "INPUT_CHANGED",
      input: input(job()),
    });

    expect(dirty.status).toBe("dirty");
    expect(changedImage.status).toBe("dirty");
    expect(restored.status).toBe("success");
  });

  it("regenerates while retaining and then replacing the previous result", () => {
    const success = firstSuccess();
    const nextJob = job(2, "1:40:24:16:white");
    const dirty = generatorReducer(success, {
      type: "INPUT_CHANGED",
      input: input(nextJob),
    });
    const regenerating = generatorReducer(dirty, {
      type: "STARTED",
      job: nextJob,
    });
    const updated = generatorReducer(regenerating, {
      type: "SUCCEEDED",
      jobId: 2,
      result: RESULT,
    });

    expect(regenerating.status).toBe("regenerating");
    expect(regenerating).toHaveProperty("lastSuccess");
    expect(updated).toMatchObject({ status: "success" });
    if (updated.status === "success")
      expect(updated.lastSuccess.snapshot.jobId).toBe(2);
  });

  it("retains the previous result after regeneration abort or failure", () => {
    const success = firstSuccess();
    const nextJob = job(2, "1:40:24:16:white");
    const dirty = generatorReducer(success, {
      type: "INPUT_CHANGED",
      input: input(nextJob),
    });
    const regenerating = generatorReducer(dirty, {
      type: "STARTED",
      job: nextJob,
    });
    const aborted = generatorReducer(regenerating, {
      type: "ABORTED",
      jobId: 2,
    });
    const failed = generatorReducer(regenerating, {
      type: "FAILED",
      jobId: 2,
      error: { code: "pattern-failed", message: "Safe message" },
    });

    expect(aborted).toHaveProperty("lastSuccess.snapshot.jobId", 1);
    expect(failed).toHaveProperty("lastSuccess.snapshot.jobId", 1);
  });

  it("ignores stale completion events and invalid starts", () => {
    const snapshot = job(3);
    const loaded = generatorReducer(INITIAL_GENERATOR_STATE, {
      type: "INPUT_CHANGED",
      input: input(snapshot),
    });
    const processing = generatorReducer(loaded, {
      type: "STARTED",
      job: snapshot,
    });

    expect(
      generatorReducer(processing, {
        type: "SUCCEEDED",
        jobId: 2,
        result: RESULT,
      }),
    ).toBe(processing);
    expect(
      generatorReducer(processing, {
        type: "FAILED",
        jobId: 2,
        error: { code: "unknown", message: "safe" },
      }),
    ).toBe(processing);
    expect(generatorReducer(processing, { type: "ABORTED", jobId: 2 })).toBe(
      processing,
    );
    expect(
      generatorReducer(INITIAL_GENERATOR_STATE, {
        type: "STARTED",
        job: snapshot,
      }),
    ).toBe(INITIAL_GENERATOR_STATE);
  });

  it("marks a late success dirty when input changed during processing", () => {
    const snapshot = job();
    const loaded = generatorReducer(INITIAL_GENERATOR_STATE, {
      type: "INPUT_CHANGED",
      input: input(snapshot),
    });
    const processing = generatorReducer(loaded, {
      type: "STARTED",
      job: snapshot,
    });
    const changed = generatorReducer(processing, {
      type: "INPUT_CHANGED",
      input: input(job(2, "1:40:24:16:white")),
    });
    const completed = generatorReducer(changed, {
      type: "SUCCEEDED",
      jobId: 1,
      result: RESULT,
    });

    expect(completed.status).toBe("dirty");
    expect(completed).toHaveProperty(
      "lastSuccess.snapshot.inputKey",
      snapshot.inputKey,
    );
  });

  it("removes image from every applicable state and leaves source states immutable", () => {
    const success = firstSuccess();
    const before = structuredClone({ status: success.status });
    const idle = generatorReducer(success, {
      type: "INPUT_CHANGED",
      input: null,
    });

    expect(idle).toEqual({ status: "idle" });
    expect({ status: success.status }).toEqual(before);
  });
});
