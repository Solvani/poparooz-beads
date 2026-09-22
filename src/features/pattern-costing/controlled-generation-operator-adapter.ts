import { bindControlledGenerationManifest } from "./manifest";
import {
  ControlledGenerationSession,
  type ControlledGenerationSessionOptions,
} from "./controlled-generation-session";

export const PATTERN_COSTING_SEMANTIC_AUTHORITY =
  "git:a0005ecf885db2d458679b20ec7c6006d7b12b79" as const;

export async function createControlledGenerationSession(
  rawManifestBytes: Uint8Array,
  assertionId: string,
  options: ControlledGenerationSessionOptions = {},
): Promise<ControlledGenerationSession> {
  const authority = await bindControlledGenerationManifest(rawManifestBytes, {
    assertionId,
    acceptedGeneratorImplementationAuthorityId:
      PATTERN_COSTING_SEMANTIC_AUTHORITY,
  });
  return new ControlledGenerationSession(authority, options);
}
