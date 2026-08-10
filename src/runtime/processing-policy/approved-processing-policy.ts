import { createProcessingPolicyProvider } from "./processing-policy.provider";
import type { ProcessingPolicySnapshot } from "./processing-policy.types";

const APPROVED_PROCESSING_POLICY = {
  policyId: "poparooz-processing-policy",
  policyVersion: "1.0.0",
  imageNormalization: {
    preserveAspectRatio: true,
    fit: "contain",
    allowUpscale: false,
  },
  quantization: {
    alphaThresholdByte: 16,
    maxColors: { minimum: 2, default: 32, maximum: 64 },
  },
} satisfies ProcessingPolicySnapshot;

export function createApprovedProcessingPolicyProvider() {
  return createProcessingPolicyProvider(APPROVED_PROCESSING_POLICY);
}
