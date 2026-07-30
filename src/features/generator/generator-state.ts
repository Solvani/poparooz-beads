import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { SafeGenerationError } from "./generation-error";
import type {
  GenerationCandidate,
  GenerationInputSnapshot,
} from "./generation.types";

export interface CurrentGeneratorInput {
  readonly imageVersion: number;
  readonly candidate: GenerationCandidate | null;
}

export interface LastGenerationSuccess {
  readonly snapshot: GenerationInputSnapshot;
  readonly result: PublicPatternResult;
}

interface WithInput {
  readonly input: CurrentGeneratorInput;
}

interface WithLastSuccess {
  readonly lastSuccess: LastGenerationSuccess;
}

export type GeneratorState =
  | { readonly status: "idle" }
  | ({ readonly status: "image-loaded" } & WithInput)
  | ({
      readonly status: "processing";
      readonly job: GenerationInputSnapshot;
    } & WithInput)
  | ({ readonly status: "success" } & WithInput & WithLastSuccess)
  | ({ readonly status: "dirty" } & WithInput & WithLastSuccess)
  | ({
      readonly status: "regenerating";
      readonly job: GenerationInputSnapshot;
    } & WithInput &
      WithLastSuccess)
  | ({
      readonly status: "aborted";
      readonly lastSuccess?: LastGenerationSuccess;
    } & WithInput)
  | ({
      readonly status: "error";
      readonly error: SafeGenerationError;
      readonly lastSuccess?: LastGenerationSuccess;
    } & WithInput);

export const INITIAL_GENERATOR_STATE: GeneratorState = Object.freeze({
  status: "idle",
});

export function getLastSuccess(
  state: GeneratorState,
): LastGenerationSuccess | undefined {
  return "lastSuccess" in state ? state.lastSuccess : undefined;
}

export function getCurrentInput(
  state: GeneratorState,
): CurrentGeneratorInput | null {
  return "input" in state ? state.input : null;
}
