import { describe, expect, it } from "vitest";

import {
  assertExactEvidenceIdentity,
  assertProductionBaselineState,
  D04_A01_AUTHORIZED_PRODUCTION_BASELINE,
  type ProductionBaselineState,
} from "./generator-quality-evidence-verifier.ts";

const evidenceHead = "c9eab1e8c0548f9915a3ecb791b9ccbdaa43f92c";

describe("D04-A01 evidence verifier lifecycle", () => {
  it("allows a later evidence HEAD when production content is unchanged", () => {
    expect(() => assertProductionBaselineState(validState())).not.toThrow();
  });

  it("rejects a wrong or missing authorized production baseline", () => {
    expect(() =>
      assertProductionBaselineState({
        ...validState(),
        recordedProductionBaseline: "0".repeat(40),
      }),
    ).toThrow("Recorded D04-A01 production baseline differs.");
    expect(() =>
      assertProductionBaselineState({
        ...validState(),
        authorizedBaselineExists: false,
      }),
    ).toThrow("Authorized D04-A01 production baseline is missing.");
  });

  it("rejects production-authoritative drift after the baseline", () => {
    expect(() =>
      assertProductionBaselineState({
        ...validState(),
        changedPaths: ["src/domain/pattern/pattern-assembler.ts"],
      }),
    ).toThrow("Production-authoritative content differs");
    expect(() =>
      assertProductionBaselineState({
        ...validState(),
        changedPaths: ["package-lock.json"],
      }),
    ).toThrow("Production-authoritative content differs");
  });

  it("allows evaluation tests, evidence, and governance after the baseline", () => {
    expect(() =>
      assertProductionBaselineState({
        ...validState(),
        changedPaths: [
          "scripts/quality/generator/example.test.ts",
          "data-source/quality/example/evidence.json",
          "docs/EXAMPLE_EVALUATION.md",
        ],
      }),
    ).not.toThrow();
  });

  it("keeps exact canonical evidence identity mandatory", () => {
    expect(() =>
      assertExactEvidenceIdentity("canonical", "canonical", "evidence"),
    ).not.toThrow();
    expect(() =>
      assertExactEvidenceIdentity("tampered", "canonical", "evidence"),
    ).toThrow("evidence is not deterministic.");
  });
});

function validState(): ProductionBaselineState {
  return {
    authorizedProductionBaseline: D04_A01_AUTHORIZED_PRODUCTION_BASELINE,
    recordedProductionBaseline: D04_A01_AUTHORIZED_PRODUCTION_BASELINE,
    currentRepositoryHead: evidenceHead,
    authorizedBaselineExists: true,
    authorizedBaselineIsAncestor: true,
    changedPaths: [],
  };
}
