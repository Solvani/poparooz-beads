// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  assertNestedProfiles,
  calculateRefillPacks,
  generateAuthoritativePolicyEvaluation,
  parseAuthoritativeSource,
  recommendProfile,
  serializePolicyEvaluation,
  verifyCheckedInPolicyEvaluation,
} from "./e05-recommendation-policy-evaluation.ts";

const sourcePath =
  "data-source/quality/generator-e05-evidence/1.0.0/e05-production-evidence.json";

describe("Recommendation Policy v1 closure", () => {
  it("recommends exactly Required for every authoritative run", () => {
    const evaluation = generateAuthoritativePolicyEvaluation();

    expect(evaluation.profileOrder).toEqual([24, 48, 72, 120, 168, 221]);
    expect(evaluation.requiredDistribution).toEqual({
      "24": 0,
      "48": 0,
      "72": 0,
      "120": 0,
      "168": 13,
      "221": 41,
    });
    expect(evaluation.recommendedDistribution).toEqual(
      evaluation.requiredDistribution,
    );
    expect(evaluation.runs).toHaveLength(54);
    expect(
      evaluation.runs.every(
        (run) =>
          run.recommendedProfile === run.requiredProfile &&
          run.upgraded === false,
      ),
    ).toBe(true);
  });

  it("keeps Required 221 at the ceiling and Required 168 at zero gain", () => {
    const evaluation = generateAuthoritativePolicyEvaluation();
    const required221 = evaluation.runs.filter(
      (run) => run.requiredProfile === 221,
    );
    const required168 = evaluation.runs.filter(
      (run) => run.requiredProfile === 168,
    );

    expect(required221).toHaveLength(41);
    expect(required221.every((run) => run.recommendedProfile === 221)).toBe(
      true,
    );
    expect(required168).toHaveLength(13);
    expect(required168.every((run) => run.recommendedProfile === 168)).toBe(
      true,
    );
    expect(evaluation.eligibleUpgradeAnalysis).toMatchObject({
      eligibleRunCount: 13,
      upgradedRunCount: 0,
      allWeightedMeanGainsZero: true,
      allWeightedP95GainsZero: true,
      allMaximumGainsZero: true,
    });
  });

  it("verifies profile nesting and rejects a broken nesting boundary", () => {
    const profiles = JSON.parse(
      readFileSync(
        "src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json",
        "utf8",
      ),
    ) as Parameters<typeof assertNestedProfiles>[0];
    expect(() => assertNestedProfiles(profiles)).not.toThrow();

    const broken = {
      profiles: profiles.profiles.map((profile, index) =>
        index === 1
          ? {
              ...profile,
              memberCodes: profile.memberCodes.filter(
                (code) => code !== profiles.profiles[0]!.memberCodes[0],
              ),
            }
          : profile,
      ),
    };
    expect(() => assertNestedProfiles(broken)).toThrow(
      "formal profile identity",
    );
  });

  it.each([
    [999, 0],
    [1000, 0],
    [1001, 1],
    [1999, 1],
    [2000, 1],
    [2001, 2],
    [9679, 9],
  ])("calculates %i beads as %i refill packs", (beads, refills) => {
    expect(calculateRefillPacks(beads)).toBe(refills);
  });

  it("keeps refill quantity independent from Recommendation", () => {
    expect(recommendProfile(168)).toBe(168);
    expect(calculateRefillPacks(999)).toBe(0);
    expect(calculateRefillPacks(9679)).toBe(9);
    expect(recommendProfile(168)).toBe(168);
  });

  it("fails closed when source evidence bytes change", () => {
    const source = readFileSync(sourcePath);
    const changed = Buffer.from(source);
    changed[changed.length - 2] = changed[changed.length - 2] === 32 ? 33 : 32;
    expect(() => parseAuthoritativeSource(changed)).toThrow(
      "complete JSON SHA-256 mismatch",
    );
  });

  it("is byte stable and matches the checked-in canonical artifact", () => {
    const first = generateAuthoritativePolicyEvaluation();
    const second = generateAuthoritativePolicyEvaluation();

    expect(serializePolicyEvaluation(first)).toBe(
      serializePolicyEvaluation(second),
    );
    expect(first.canonicalPolicyEvidenceSha256).toBe(
      second.canonicalPolicyEvidenceSha256,
    );
    expect(verifyCheckedInPolicyEvaluation()).toEqual(first);
  });
});
