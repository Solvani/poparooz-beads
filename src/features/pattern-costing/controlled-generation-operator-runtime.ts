import { bindControlledGenerationManifest } from "./manifest";
import {
  createRuntimeBackedControlledGenerationSession,
  type ControlledGenerationAttemptConsumptionRegistry,
  type ControlledGenerationSession,
  type ControlledGenerationSessionOptions,
} from "./controlled-generation-session";

export const PATTERN_COSTING_SEMANTIC_AUTHORITY =
  "git:a0005ecf885db2d458679b20ec7c6006d7b12b79" as const;

export const CONTROLLED_GENERATION_CONSUMPTION_SCOPE =
  "one-shot within one live ControlledGenerationOperatorRuntime" as const;

export class ControlledGenerationOperatorRuntime {
  readonly #consumedAttemptKeys = new Set<string>();
  readonly #registry: ControlledGenerationAttemptConsumptionRegistry = {
    isConsumed: (attemptKey) => this.#consumedAttemptKeys.has(attemptKey),
    consume: (attemptKey) => {
      if (this.#consumedAttemptKeys.has(attemptKey)) return false;
      this.#consumedAttemptKeys.add(attemptKey);
      return true;
    },
  };

  async createSession(
    rawManifestBytes: Uint8Array,
    assertionId: string,
    options: ControlledGenerationSessionOptions = {},
  ): Promise<ControlledGenerationSession> {
    const authority = await bindControlledGenerationManifest(rawManifestBytes, {
      assertionId,
      acceptedGeneratorImplementationAuthorityId:
        PATTERN_COSTING_SEMANTIC_AUTHORITY,
    });
    return createRuntimeBackedControlledGenerationSession(
      authority,
      this.#registry,
      options,
    );
  }
}
