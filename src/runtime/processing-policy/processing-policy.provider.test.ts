import { describe, expect, it } from "vitest";

import { createApprovedProcessingPolicyProvider } from "./approved-processing-policy";
import { ProcessingPolicyError } from "./processing-policy.errors";
import { createProcessingPolicyProvider } from "./processing-policy.provider";
import type { ProcessingPolicySnapshot } from "./processing-policy.types";

const approved = () => createApprovedProcessingPolicyProvider().getSnapshot();

describe("approved ProcessingPolicy Provider", () => {
  it("returns the exact deeply immutable approved snapshot", () => {
    const snapshot = approved();
    expect(snapshot).toEqual({
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
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.imageNormalization)).toBe(true);
    expect(Object.isFrozen(snapshot.quantization)).toBe(true);
    expect(Object.isFrozen(snapshot.quantization.maxColors)).toBe(true);
  });

  const invalidCases: readonly [
    string,
    (value: ProcessingPolicySnapshot) => unknown,
  ][] = [
    [
      "missing field",
      ({ policyId, imageNormalization, quantization }) => ({
        policyId,
        imageNormalization,
        quantization,
      }),
    ],
    ["unknown field", (value) => ({ ...value, fallback: true })],
    ["wrong identity", (value) => ({ ...value, policyId: "other" })],
    ["wrong version", (value) => ({ ...value, policyVersion: "2.0.0" })],
    [
      "wrong nested value",
      (value) => ({
        ...value,
        imageNormalization: {
          ...value.imageNormalization,
          allowUpscale: true,
        },
      }),
    ],
  ];

  it.each(invalidCases)("rejects %s without fallback", (_label, mutate) => {
    expect(() =>
      createProcessingPolicyProvider(mutate(approved())),
    ).toThrowError(ProcessingPolicyError);
  });

  it("does not read environment or allow source mutation to affect the snapshot", () => {
    const source = structuredClone(approved());
    const provider = createProcessingPolicyProvider(source);
    Reflect.set(source.quantization, "alphaThresholdByte", 0);
    expect(provider.getSnapshot().quantization.alphaThresholdByte).toBe(16);
    expect(provider.getSnapshot()).toBe(provider.getSnapshot());
  });
});
