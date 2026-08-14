import type { GeneratorQualityGateResult } from "./generator-quality.types.ts";

export function exactByteIdentityGate(
  id: string,
  baseline: ArrayLike<number>,
  candidate: ArrayLike<number>,
): GeneratorQualityGateResult {
  let identical = baseline.length === candidate.length;
  for (let index = 0; identical && index < baseline.length; index += 1) {
    identical = baseline[index] === candidate[index];
  }
  return Object.freeze({
    id,
    status: identical ? "passed" : "failed",
    actual: identical ? "byte-identical" : "different",
    expected: "byte-identical",
  });
}

export function exactValueGate(
  id: string,
  actual: number | string,
  expected: number | string,
): GeneratorQualityGateResult {
  return Object.freeze({
    id,
    status: actual === expected ? "passed" : "failed",
    actual,
    expected,
  });
}

export function deterministicSerializationGate(
  baselineBytes: string,
  repeatedBytes: string,
): GeneratorQualityGateResult {
  return Object.freeze({
    id: "deterministic-repeated-result",
    status: baselineBytes === repeatedBytes ? "passed" : "failed",
    actual: baselineBytes === repeatedBytes ? "byte-identical" : "different",
    expected: "byte-identical",
  });
}
