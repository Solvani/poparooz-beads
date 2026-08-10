import {
  getLastSuccess,
  type GeneratorState,
} from "../generator/generator-state";
import type {
  PatternActionCapabilities,
  PatternActionResultScope,
  PatternActionState,
} from "./pattern-action.types";

export const PRODUCTION_PATTERN_ACTION_CAPABILITIES: PatternActionCapabilities =
  Object.freeze({
    downloadPattern: true,
    getBeads: false,
  });

const NO_RESULT_MESSAGE =
  "Create a pattern to access download and bead options.";
const UNAVAILABLE_MESSAGE =
  "Download and bead options are not available in this preview.";
const DOWNLOAD_AVAILABLE_MESSAGE = "Download your color code pattern as a PNG.";

function previousResultMessage(state: GeneratorState): string | null {
  switch (state.status) {
    case "dirty":
      return "These actions apply to your previous pattern.";
    case "regenerating":
      return "Your previous pattern remains available while the update is processing.";
    case "aborted":
      return state.lastSuccess
        ? "Pattern update stopped. These actions still apply to your previous pattern."
        : null;
    case "error":
      return state.lastSuccess
        ? "Pattern update failed. These actions still apply to your previous pattern."
        : null;
    default:
      return null;
  }
}

function resultScope(state: GeneratorState): PatternActionResultScope {
  if (state.status === "success") return "current-result";
  return getLastSuccess(state) ? "previous-result" : "none";
}

export function toPatternActionState(
  state: GeneratorState,
  capabilities: PatternActionCapabilities = PRODUCTION_PATTERN_ACTION_CAPABILITIES,
): PatternActionState {
  const lastSuccess = getLastSuccess(state);
  const hasResult = lastSuccess !== undefined;

  return {
    hasResult,
    resultIdentity: lastSuccess?.snapshot.jobId ?? null,
    resultScope: resultScope(state),
    downloadEnabled: hasResult && capabilities.downloadPattern,
    getBeadsEnabled: hasResult && capabilities.getBeads,
    availabilityMessage: hasResult
      ? capabilities.downloadPattern
        ? DOWNLOAD_AVAILABLE_MESSAGE
        : UNAVAILABLE_MESSAGE
      : NO_RESULT_MESSAGE,
    scopeMessage: previousResultMessage(state),
  };
}
