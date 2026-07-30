import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { SafeGenerationError } from "./generation-error";
import {
  getLastSuccess,
  type CurrentGeneratorInput,
  type GeneratorState,
  type LastGenerationSuccess,
} from "./generator-state";
import type { GenerationInputSnapshot } from "./generation.types";

export type GeneratorEvent =
  | {
      readonly type: "INPUT_CHANGED";
      readonly input: CurrentGeneratorInput | null;
    }
  | { readonly type: "STARTED"; readonly job: GenerationInputSnapshot }
  | {
      readonly type: "SUCCEEDED";
      readonly jobId: number;
      readonly result: PublicPatternResult;
    }
  | { readonly type: "ABORTED"; readonly jobId: number }
  | {
      readonly type: "FAILED";
      readonly jobId: number;
      readonly error: SafeGenerationError;
    };

export function generatorReducer(
  state: GeneratorState,
  event: GeneratorEvent,
): GeneratorState {
  switch (event.type) {
    case "INPUT_CHANGED":
      return reduceInputChange(state, event.input);
    case "STARTED":
      return reduceStarted(state, event.job);
    case "SUCCEEDED":
      return reduceSucceeded(state, event.jobId, event.result);
    case "ABORTED":
      return reduceAborted(state, event.jobId);
    case "FAILED":
      return reduceFailed(state, event.jobId, event.error);
  }
}

function reduceInputChange(
  state: GeneratorState,
  input: CurrentGeneratorInput | null,
): GeneratorState {
  if (input === null) return { status: "idle" };
  if (state.status === "processing" || state.status === "regenerating") {
    return { ...state, input };
  }
  const lastSuccess = getLastSuccess(state);
  if (lastSuccess === undefined) return { status: "image-loaded", input };
  return isCurrent(input, lastSuccess.snapshot)
    ? { status: "success", input, lastSuccess }
    : { status: "dirty", input, lastSuccess };
}

function reduceStarted(
  state: GeneratorState,
  job: GenerationInputSnapshot,
): GeneratorState {
  if (state.status === "idle") return state;
  const input = state.input;
  if (input.candidate?.inputKey !== job.inputKey) return state;
  const lastSuccess = getLastSuccess(state);
  return lastSuccess === undefined
    ? { status: "processing", input, job }
    : { status: "regenerating", input, job, lastSuccess };
}

function reduceSucceeded(
  state: GeneratorState,
  jobId: number,
  result: PublicPatternResult,
): GeneratorState {
  if (!isActiveJob(state, jobId)) return state;
  const lastSuccess: LastGenerationSuccess = Object.freeze({
    snapshot: state.job,
    result,
  });
  return isCurrent(state.input, state.job)
    ? { status: "success", input: state.input, lastSuccess }
    : { status: "dirty", input: state.input, lastSuccess };
}

function reduceAborted(state: GeneratorState, jobId: number): GeneratorState {
  if (!isActiveJob(state, jobId)) return state;
  const lastSuccess = getLastSuccess(state);
  return {
    status: "aborted",
    input: state.input,
    ...(lastSuccess === undefined ? {} : { lastSuccess }),
  };
}

function reduceFailed(
  state: GeneratorState,
  jobId: number,
  error: SafeGenerationError,
): GeneratorState {
  if (!isActiveJob(state, jobId)) return state;
  const lastSuccess = getLastSuccess(state);
  return {
    status: "error",
    input: state.input,
    error,
    ...(lastSuccess === undefined ? {} : { lastSuccess }),
  };
}

function isActiveJob(
  state: GeneratorState,
  jobId: number,
): state is Extract<GeneratorState, { status: "processing" | "regenerating" }> {
  return (
    (state.status === "processing" || state.status === "regenerating") &&
    state.job.jobId === jobId
  );
}

function isCurrent(
  input: CurrentGeneratorInput,
  snapshot: GenerationInputSnapshot,
): boolean {
  return input.candidate?.inputKey === snapshot.inputKey;
}
