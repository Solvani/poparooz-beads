import { z } from "zod";

import { ProcessingPolicyError } from "./processing-policy.errors";
import type { ProcessingPolicySnapshot } from "./processing-policy.types";

export const ProcessingPolicySnapshotSchema = z
  .object({
    policyId: z.literal("poparooz-processing-policy"),
    policyVersion: z.literal("1.0.0"),
    imageNormalization: z
      .object({
        preserveAspectRatio: z.literal(true),
        fit: z.literal("contain"),
        allowUpscale: z.literal(false),
      })
      .strict(),
    quantization: z
      .object({
        alphaThresholdByte: z.literal(16),
        maxColors: z
          .object({
            minimum: z.literal(2),
            default: z.literal(32),
            maximum: z.literal(64),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export function parseProcessingPolicySnapshot(
  input: unknown,
): ProcessingPolicySnapshot {
  const result = ProcessingPolicySnapshotSchema.safeParse(input);
  if (!result.success) {
    throw new ProcessingPolicyError("PROCESSING_POLICY_INVALID", {
      cause: result.error,
    });
  }
  return result.data;
}
