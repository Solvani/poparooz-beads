import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { quantizeImage } from "../../../src/domain/quantization/quantize-image.ts";
import {
  calibrationSplit,
  D04_PROFILE_SIZES,
  evaluateSixProfilePatterns,
  patternMatrixSha256,
  patternsExactlyEquivalent,
} from "./generator-quality-d04-recommendation.ts";
import { loadGeneratorQualityDependencies } from "./generator-quality-replay.ts";

const dependencies = loadGeneratorQualityDependencies(process.cwd());
const evidenceDirectory = path.join(
  process.cwd(),
  "data-source/quality/generator-e05-d04-evidence/1.0.0",
);

describe("D04-A01 six-profile Pattern evidence", () => {
  it("assembles exactly the approved profiles from one quantized input", () => {
    const pixels = Array.from({ length: 16 }, (_, index) =>
      index % 2 === 0 ? [255, 0, 0, 255] : [20, 170, 80, 255],
    ).flat();
    const quantized = quantizeImage(
      {
        width: 4,
        height: 4,
        data: new Uint8ClampedArray(pixels),
      },
      { maxColors: 8, alphaThreshold: 16 },
    );
    const result = evaluateSixProfilePatterns(quantized, dependencies);

    expect(result.profiles.map((item) => item.profileSize)).toEqual(
      D04_PROFILE_SIZES,
    );
    expect(result.profiles).toHaveLength(6);
    expect(result.adjacentComparisons).toHaveLength(5);
    expect(result.relativeTo221).toHaveLength(5);
    expect(
      result.profiles.every(
        (item) =>
          item.occupiedBeadCount === 16 &&
          item.transparentPositionCount === 0 &&
          /^[a-f0-9]{64}$/.test(item.matrixSha256),
      ),
    ).toBe(true);
  });

  it("uses final color-code identity instead of profile-local indexes", () => {
    const quantized = quantizeImage(
      {
        width: 2,
        height: 2,
        data: new Uint8ClampedArray([
          255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0,
        ]),
      },
      { maxColors: 3, alphaThreshold: 16 },
    );
    const first = evaluateSixProfilePatterns(quantized, dependencies);
    const second = evaluateSixProfilePatterns(quantized, dependencies);
    const first221 = first.patterns.get(221)!;
    const second221 = second.patterns.get(221)!;

    expect(patternMatrixSha256(first221)).toBe(patternMatrixSha256(second221));
    expect(patternsExactlyEquivalent(first221, second221)).toBe(true);
    expect(first.profiles.find((item) => item.profileSize === 221)).toEqual(
      second.profiles.find((item) => item.profileSize === 221),
    );
  });

  it("keeps the case-level calibration split deterministic", () => {
    expect(calibrationSplit("portrait-sweater-pair")).toBe(
      calibrationSplit("portrait-sweater-pair"),
    );
    expect(["calibration", "validation"]).toContain(
      calibrationSplit("portrait-sweater-pair"),
    );
  });

  it("validates the permanent evidence and review boundary", () => {
    const evidence = readJson("e05-d04-six-profile-pattern-evidence.json");
    const review = readJson("e05-d04-controlled-visual-review.json");
    const analysis = readJson("e05-d04-policy-candidate-analysis.json");
    const runtime = readJson("e05-d04-runtime-performance.json");

    expect(evidence).toMatchObject({
      productionActivation: false,
      canonicalEvidenceSha256:
        "1b58d8670444fb91f9b5026db06633aa0d975a01261b2adcd2bb0ef515850c89",
      hardGates: {
        exactSixProfiles: true,
        productionOracleParity: true,
        parityChecks: 612,
      },
    });
    expect(review).toMatchObject({
      reviewerType: "controlled_model_visual_review",
      humanReviewer: false,
      blindAtJudgmentTime: true,
    });
    expect(analysis).toMatchObject({
      productionActivation: false,
      decision:
        "GENERATION RECOMMENDATION EVIDENCE INSUFFICIENT — MORE EVALUATION REQUIRED",
      calibrationValidation: {
        calibrationPairs: 75,
        validationPairs: 45,
        validationResult: { totalErrors: 9, errorRate: 0.2 },
      },
    });
    expect(runtime).toMatchObject({
      mobileBrowser: { available: false },
    });
  });
});

function readJson(fileName: string): unknown {
  return JSON.parse(
    readFileSync(path.join(evidenceDirectory, fileName), "utf8"),
  ) as unknown;
}
