import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import type { PatternSettingsDraft } from "../settings/settings.types";
import { validatePatternSettings } from "../settings/settings-validation";
import {
  isGenerationCancellation,
  toSafeGenerationError,
} from "./generation-error";
import { generatorReducer } from "./generator-reducer";
import {
  INITIAL_GENERATOR_STATE,
  type CurrentGeneratorInput,
} from "./generator-state";
import type {
  GenerationInputSnapshot,
  GenerationRuntime,
} from "./generation.types";

interface ActiveGeneration {
  readonly jobId: number;
  readonly inputKey: string;
  readonly controller: AbortController;
}

export interface UseGeneratorControllerOptions {
  readonly file: File | null;
  readonly imageVersion: number;
  readonly settings: PatternSettingsDraft;
  readonly runtime: GenerationRuntime;
}

export function useGeneratorController({
  file,
  imageVersion,
  settings,
  runtime,
}: UseGeneratorControllerOptions) {
  const [state, dispatch] = useReducer(
    generatorReducer,
    INITIAL_GENERATOR_STATE,
  );
  const nextJobId = useRef(1);
  const active = useRef<ActiveGeneration | null>(null);
  const mounted = useRef(true);

  const input = useMemo<CurrentGeneratorInput | null>(() => {
    if (file === null) return null;
    const validation = validatePatternSettings(settings);
    if (!validation.valid) return { imageVersion, candidate: null };
    const stableSettings = Object.freeze({ ...validation.value });
    return Object.freeze({
      imageVersion,
      candidate: Object.freeze({
        file,
        imageVersion,
        settings: stableSettings,
        inputKey: createInputKey(imageVersion, stableSettings),
      }),
    });
  }, [file, imageVersion, settings]);
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
    if (input === null) {
      const current = active.current;
      active.current = null;
      current?.controller.abort();
    }
    dispatch({ type: "INPUT_CHANGED", input });
  }, [input]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = active.current;
      active.current = null;
      current?.controller.abort();
    };
  }, []);

  const generate = useCallback((): boolean => {
    const candidate = inputRef.current?.candidate;
    if (candidate == null) return false;
    if (!runtime.availability.available || runtime.service === undefined)
      return false;
    const service = runtime.service;
    const running = active.current;
    if (running?.inputKey === candidate.inputKey) return false;
    if (running !== null) running.controller.abort();

    const jobId = nextJobId.current;
    nextJobId.current += 1;
    const snapshot: GenerationInputSnapshot = Object.freeze({
      ...candidate,
      settings: Object.freeze({ ...candidate.settings }),
      jobId,
    });
    const controller = new AbortController();
    active.current = { jobId, inputKey: snapshot.inputKey, controller };
    dispatch({ type: "STARTED", job: snapshot });

    void service.generate(snapshot, controller.signal).then(
      (result) => {
        if (!mounted.current || active.current?.jobId !== jobId) return;
        active.current = null;
        dispatch({ type: "SUCCEEDED", jobId, result });
      },
      (error: unknown) => {
        if (!mounted.current || active.current?.jobId !== jobId) return;
        active.current = null;
        if (isGenerationCancellation(error)) {
          dispatch({ type: "ABORTED", jobId });
          return;
        }
        dispatch({
          type: "FAILED",
          jobId,
          error: toSafeGenerationError(error),
        });
      },
    );
    return true;
  }, [runtime]);

  const abort = useCallback((): boolean => {
    const current = active.current;
    if (current === null) return false;
    active.current = null;
    current.controller.abort();
    if (mounted.current) dispatch({ type: "ABORTED", jobId: current.jobId });
    return true;
  }, []);

  const reset = useCallback(() => {
    const current = active.current;
    active.current = null;
    current?.controller.abort();
    dispatch({ type: "INPUT_CHANGED", input: null });
  }, []);

  const running =
    state.status === "processing" || state.status === "regenerating";
  const hasValidInput = input?.candidate !== null && input !== null;
  const canStart = runtime.availability.available && hasValidInput && !running;

  return {
    state,
    availability: runtime.availability,
    canGenerate:
      canStart &&
      (state.status === "image-loaded" ||
        state.status === "aborted" ||
        state.status === "error"),
    canRegenerate: canStart && state.status === "dirty",
    generate,
    abort,
    reset,
  } as const;
}

function createInputKey(
  imageVersion: number,
  settings: {
    readonly width: number;
    readonly height: number;
    readonly maxColors: number;
    readonly background: string;
  },
): string {
  return [
    imageVersion,
    settings.width,
    settings.height,
    settings.maxColors,
    settings.background,
  ].join(":");
}
