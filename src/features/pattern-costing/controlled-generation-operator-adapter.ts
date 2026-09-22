import type { ControlledGenerationSessionOptions } from "./controlled-generation-session";
import type { ControlledGenerationOperatorRuntime } from "./controlled-generation-operator-runtime";
import type { ControlledGenerationSession } from "./controlled-generation-session";

export { PATTERN_COSTING_SEMANTIC_AUTHORITY } from "./controlled-generation-operator-runtime";

export async function createControlledGenerationSession(
  runtime: ControlledGenerationOperatorRuntime,
  rawManifestBytes: Uint8Array,
  assertionId: string,
  options: ControlledGenerationSessionOptions = {},
): Promise<ControlledGenerationSession> {
  return runtime.createSession(rawManifestBytes, assertionId, options);
}
