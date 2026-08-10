import { ProcessingPolicyError } from "./processing-policy.errors";
import { parseProcessingPolicySnapshot } from "./processing-policy.schema";
import type {
  ProcessingPolicyProvider,
  ProcessingPolicySnapshot,
} from "./processing-policy.types";

export function createProcessingPolicyProvider(
  input: unknown,
): ProcessingPolicyProvider {
  try {
    const parsed = parseProcessingPolicySnapshot(input);
    const snapshot: ProcessingPolicySnapshot = Object.freeze({
      policyId: parsed.policyId,
      policyVersion: parsed.policyVersion,
      imageNormalization: Object.freeze({
        preserveAspectRatio: parsed.imageNormalization.preserveAspectRatio,
        fit: parsed.imageNormalization.fit,
        allowUpscale: parsed.imageNormalization.allowUpscale,
      }),
      quantization: Object.freeze({
        alphaThresholdByte: parsed.quantization.alphaThresholdByte,
        maxColors: Object.freeze({
          minimum: parsed.quantization.maxColors.minimum,
          default: parsed.quantization.maxColors.default,
          maximum: parsed.quantization.maxColors.maximum,
        }),
      }),
    });
    return Object.freeze({ getSnapshot: () => snapshot });
  } catch (error) {
    if (error instanceof ProcessingPolicyError) throw error;
    throw new ProcessingPolicyError(
      "PROCESSING_POLICY_PROVIDER_INITIALIZATION_FAILED",
    );
  }
}
