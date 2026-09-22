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
import { createPatternCostingExportV21 } from "../pattern-costing/pattern-costing-export";
import { assertPrevalidatedBoundControlledGenerationAuthority } from "../pattern-costing/manifest";
import { assertPatternCostingRuntimeAuthority } from "../pattern-costing/runtime-authority";
import type { ControlledGenerationSession } from "../pattern-costing/controlled-generation-session";
import type {
  BoundControlledGenerationAuthority,
  PatternCostingAttemptContext,
  PatternCostingGenerationControl,
  PatternCostingRuntimeAuthority,
} from "../pattern-costing/pattern-costing.types";

interface ActiveGeneration {
  readonly jobId: number;
  readonly inputKey: string;
  readonly controller: AbortController;
  readonly controlled?: {
    readonly session: ControlledGenerationSession;
    readonly regeneration: boolean;
    readonly sourceInputKey: string;
  };
}

const NO_COLOR_SET_PROFILES = Object.freeze([]);

export interface UseGeneratorControllerOptions {
  readonly file: File | null;
  readonly imageVersion: number;
  readonly settings: PatternSettingsDraft;
  readonly runtime: GenerationRuntime;
  readonly patternCosting?: PatternCostingGenerationControl;
}

export function useGeneratorController({
  file,
  imageVersion,
  settings,
  runtime,
  patternCosting = DISABLED_PATTERN_COSTING,
}: UseGeneratorControllerOptions) {
  const [state, dispatch] = useReducer(
    generatorReducer,
    INITIAL_GENERATOR_STATE,
  );
  const nextJobId = useRef(1);
  const active = useRef<ActiveGeneration | null>(null);
  const lastControlledAttempt = useRef<{
    readonly session: ControlledGenerationSession;
    readonly sourceInputKey: string;
  } | null>(null);
  const mounted = useRef(true);
  const stateRef = useRef(state);
  const colorSetProfiles =
    runtime.availability.available && "colorSetProfiles" in runtime
      ? runtime.colorSetProfiles
      : NO_COLOR_SET_PROFILES;
  const patternCostingMode = patternCosting.mode;
  const controlledPatternCostingAuthority =
    patternCosting.mode === "controlled"
      ? (patternCosting.session?.authority ?? null)
      : null;

  const input = useMemo<CurrentGeneratorInput | null>(() => {
    if (file === null) return null;
    const validation = validatePatternSettings(settings, colorSetProfiles);
    if (!validation.valid) return { imageVersion, candidate: null };
    const stableSettings = Object.freeze({ ...validation.value });
    const costingAuthorityKey =
      patternCostingMode === "disabled"
        ? "pattern-costing-disabled"
        : patternCostingAuthorityKey(controlledPatternCostingAuthority);
    if (costingAuthorityKey === null) return { imageVersion, candidate: null };
    return Object.freeze({
      imageVersion,
      candidate: Object.freeze({
        file,
        imageVersion,
        settings: stableSettings,
        inputKey: createInputKey(
          imageVersion,
          stableSettings,
          costingAuthorityKey,
        ),
      }),
    });
  }, [
    colorSetProfiles,
    controlledPatternCostingAuthority,
    file,
    imageVersion,
    patternCostingMode,
    settings,
  ]);
  const inputRef = useRef(input);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    inputRef.current = input;
    if (input === null) {
      const current = active.current;
      active.current = null;
      if (current !== null) {
        current.controller.abort();
        if (current.controlled !== undefined) {
          ignoreEvidenceFailure(current.controlled.session.recordAborted());
          ignoreEvidenceFailure(
            current.controlled.session.recordRegenerationIdle(),
          );
        }
      } else if (lastControlledAttempt.current !== null) {
        ignoreEvidenceFailure(
          lastControlledAttempt.current.session.recordInputDirty(),
        );
      }
    } else {
      const candidate = input.candidate;
      if (candidate !== null) {
        const sourceInputKey = createSourceInputKey(
          candidate.imageVersion,
          candidate.settings,
        );
        const controlled =
          active.current?.controlled ?? lastControlledAttempt.current;
        if (
          controlled !== null &&
          controlled !== undefined &&
          controlled.sourceInputKey !== sourceInputKey
        )
          ignoreEvidenceFailure(controlled.session.recordInputDirty());
      }
    }
    dispatch({ type: "INPUT_CHANGED", input });
  }, [input]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = active.current;
      active.current = null;
      if (current !== null) {
        current.controller.abort();
        if (current.controlled !== undefined) {
          ignoreEvidenceFailure(current.controlled.session.recordAborted());
          ignoreEvidenceFailure(
            current.controlled.session.recordRegenerationIdle(),
          );
        }
      }
    };
  }, []);

  const generate = (): boolean => {
    const candidate = inputRef.current?.candidate;
    if (candidate == null) return false;
    if (!runtime.availability.available || runtime.service === undefined)
      return false;
    const service = runtime.service;
    const running = active.current;
    if (running?.inputKey === candidate.inputKey) return false;
    if (running !== null) {
      running.controller.abort();
      if (running.controlled !== undefined) {
        active.current = null;
        ignoreEvidenceFailure(running.controlled.session.recordAborted());
        ignoreEvidenceFailure(
          running.controlled.session.recordRegenerationIdle(),
        );
        if (mounted.current)
          dispatch({ type: "ABORTED", jobId: running.jobId });
      }
    }

    const jobId = nextJobId.current;
    nextJobId.current += 1;
    const patternCostingContext = preparePatternCostingAttemptContext(
      patternCosting,
      runtime,
      candidate.settings.selectedColorSetProfileId,
    );
    if (patternCosting.mode === "controlled" && patternCostingContext === null)
      return false;
    const regeneration = "lastSuccess" in stateRef.current;
    const controlledStart =
      patternCosting.mode === "controlled"
        ? patternCosting.session.consumeAttempt(regeneration)
        : null;
    if (controlledStart !== null && !controlledStart.accepted) {
      ignoreEvidenceFailure(controlledStart.evidenceReady);
      return false;
    }
    const snapshot: GenerationInputSnapshot = Object.freeze({
      ...candidate,
      settings: Object.freeze({ ...candidate.settings }),
      jobId,
      ...(patternCostingContext === null
        ? {}
        : { patternCosting: patternCostingContext }),
    });
    const controller = new AbortController();
    const controlled =
      patternCosting.mode === "controlled"
        ? {
            session: patternCosting.session,
            regeneration,
            sourceInputKey: createSourceInputKey(
              candidate.imageVersion,
              candidate.settings,
            ),
          }
        : undefined;
    active.current = {
      jobId,
      inputKey: snapshot.inputKey,
      controller,
      ...(controlled === undefined ? {} : { controlled }),
    };
    if (controlled !== undefined)
      lastControlledAttempt.current = {
        session: controlled.session,
        sourceInputKey: controlled.sourceInputKey,
      };
    dispatch({ type: "STARTED", job: snapshot });

    const onSuccess = async (
      result: Awaited<ReturnType<typeof service.generate>>,
    ) => {
      if (!mounted.current || active.current?.jobId !== jobId) {
        if (controlled !== undefined)
          await controlled.session.recordStaleCallback("SUCCESS");
        return;
      }
      active.current = null;
      dispatch({ type: "SUCCEEDED", jobId, result });
      if (controlled === undefined) return;
      const currentInput = inputRef.current;
      if (currentInput?.candidate?.inputKey !== snapshot.inputKey) {
        await controlled.session.recordInputDirty();
        await controlled.session.recordRegenerationIdle();
        return;
      }
      try {
        const artifact = await createPatternCostingExportV21({
          status: "success",
          input: currentInput,
          lastSuccess: Object.freeze({ snapshot, result }),
        });
        if (
          inputRef.current?.candidate?.inputKey !== snapshot.inputKey ||
          active.current !== null
        ) {
          await controlled.session.recordInputDirty();
        } else {
          await controlled.session.recordSucceeded(artifact);
        }
      } catch {
        await controlled.session.recordFailed(
          "pattern-costing-artifact-invalid",
        );
      }
      await controlled.session.recordRegenerationIdle();
    };

    const onFailure = async (error: unknown) => {
      if (!mounted.current || active.current?.jobId !== jobId) {
        if (controlled !== undefined)
          await controlled.session.recordStaleCallback("FAILURE");
        return;
      }
      active.current = null;
      if (isGenerationCancellation(error)) {
        dispatch({ type: "ABORTED", jobId });
        if (controlled !== undefined) {
          await controlled.session.recordAborted();
          await controlled.session.recordRegenerationIdle();
        }
        return;
      }
      const safeError = toSafeGenerationError(error);
      dispatch({ type: "FAILED", jobId, error: safeError });
      if (controlled !== undefined) {
        await controlled.session.recordFailed(safeError.code);
        await controlled.session.recordRegenerationIdle();
      }
    };

    const invokeService = () => service.generate(snapshot, controller.signal);
    if (controlledStart === null) {
      try {
        void invokeService().then(onSuccess, onFailure);
      } catch (error: unknown) {
        void onFailure(error);
      }
    } else {
      void controlledStart.evidenceReady
        .then(invokeService)
        .then(onSuccess, onFailure);
    }
    return true;
  };

  const abort = useCallback((): boolean => {
    const current = active.current;
    if (current === null) return false;
    active.current = null;
    current.controller.abort();
    if (current.controlled !== undefined) {
      ignoreEvidenceFailure(current.controlled.session.recordAborted());
      ignoreEvidenceFailure(
        current.controlled.session.recordRegenerationIdle(),
      );
    }
    if (mounted.current) dispatch({ type: "ABORTED", jobId: current.jobId });
    return true;
  }, []);

  const reset = useCallback(() => {
    const current = active.current;
    active.current = null;
    if (current !== null) {
      current.controller.abort();
      if (current.controlled !== undefined) {
        ignoreEvidenceFailure(current.controlled.session.recordAborted());
        ignoreEvidenceFailure(
          current.controlled.session.recordRegenerationIdle(),
        );
      }
    }
    dispatch({ type: "INPUT_CHANGED", input: null });
  }, []);

  const running =
    state.status === "processing" || state.status === "regenerating";
  const hasValidInput = input?.candidate !== null && input !== null;
  const canStart =
    runtime.availability.available &&
    hasValidInput &&
    !running &&
    (patternCosting.mode === "disabled" || patternCosting.session.canStart());

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
    readonly selectedColorSetProfileId: string;
  },
  costingAuthorityKey: string,
): string {
  return [
    createSourceInputKey(imageVersion, settings),
    costingAuthorityKey,
  ].join(":");
}

function createSourceInputKey(
  imageVersion: number,
  settings: {
    readonly width: number;
    readonly height: number;
    readonly maxColors: number;
    readonly background: string;
    readonly selectedColorSetProfileId: string;
  },
): string {
  return [
    imageVersion,
    settings.width,
    settings.height,
    settings.maxColors,
    settings.background,
    settings.selectedColorSetProfileId,
  ].join(":");
}

const DISABLED_PATTERN_COSTING = Object.freeze({
  mode: "disabled" as const,
});

function patternCostingAuthorityKey(
  authority: BoundControlledGenerationAuthority | null,
): string | null {
  if (
    typeof authority !== "object" ||
    authority === null ||
    typeof authority.manifestDigest !== "string" ||
    typeof authority.assertion?.assertionId !== "string" ||
    typeof authority.assertion?.generationAttemptId !== "string"
  )
    return null;
  return [
    authority.manifestDigest,
    authority.assertion.assertionId,
    authority.assertion.generationAttemptId,
  ].join("|");
}

function preparePatternCostingAttemptContext(
  control: PatternCostingGenerationControl,
  runtime: GenerationRuntime,
  selectedProfileId: string,
): PatternCostingAttemptContext | null {
  if (control.mode === "disabled") return null;
  if (
    !runtime.availability.available ||
    !("patternCostingRuntimeAuthorities" in runtime)
  )
    return null;
  const runtimeAuthority = runtime.patternCostingRuntimeAuthorities?.find(
    (candidate: PatternCostingRuntimeAuthority) =>
      candidate.generationColorSetProfileId === selectedProfileId,
  );
  if (runtimeAuthority === undefined) return null;
  try {
    assertPrevalidatedBoundControlledGenerationAuthority(
      control.session.authority,
    );
    assertPatternCostingRuntimeAuthority(runtimeAuthority);
  } catch {
    return null;
  }
  const context = Object.freeze({
    authority: control.session.authority,
    runtimeAuthority,
    generatedAt: new Date().toISOString(),
  });
  return context;
}

function ignoreEvidenceFailure(operation: Promise<unknown>): void {
  void operation.catch(() => undefined);
}
