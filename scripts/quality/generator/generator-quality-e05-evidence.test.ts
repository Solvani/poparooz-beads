import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseGeneratorQualityManifest } from "./generator-quality-manifest.ts";
import { createSyntheticGeneratorQualityFixture } from "./generator-quality-synthetic.ts";
import {
  loadGeneratorQualityDependencies,
  replaySyntheticQualityCase,
} from "./generator-quality-replay.ts";
import {
  assertNoCandidateDiagnostics,
  createE05ProductionEvidence,
  createE05ProductionRunEvidence,
  createProfileTransitions,
  createRequiredBeadSetEvidence,
  serializeE05ProductionEvidence,
  type E05ProductionIdentity,
  type E05ProductionRunEvidence,
} from "./generator-quality-e05-evidence.ts";
import type { GeneratorQualityCaseDeclaration } from "./generator-quality.types.ts";

const repositoryRoot = process.cwd();
const manifest = parseGeneratorQualityManifest(
  JSON.parse(
    readFileSync(
      "data-source/quality/generator-corpus/0.1.0/manifest.json",
      "utf8",
    ),
  ),
);
const declaration = manifest.cases.find(
  (item) => item.id === "opaque-white-background",
)!;
const dependencies = loadGeneratorQualityDependencies(repositoryRoot);
const paletteOrder = new Map(
  dependencies.palette.colors.map((color) => [color.code, color.sortOrder]),
);

describe("E05 actual-production evidence", () => {
  it("enforces exactly the six official profiles", () => {
    expect(() =>
      createRequiredBeadSetEvidence(
        ["A4"],
        {
          ...dependencies.colorSets,
          profiles: dependencies.colorSets.profiles.slice(1),
        },
        paletteOrder,
      ),
    ).toThrow(/six approved/);
  });

  it("uses canonical Runtime Palette ordering for Pattern codes", () => {
    const context = replayContext(40);
    const reversed = {
      ...context.pattern,
      colors: Object.freeze([...context.pattern.colors].reverse()),
    };
    const evidence = createE05ProductionRunEvidence({
      declaration,
      replay: context.replay,
      pattern: reversed,
      palette: dependencies.palette,
      colorSets: dependencies.colorSets,
    });
    const orders = evidence.pattern.colors.map((item) =>
      paletteOrder.get(item.code)!,
    );
    expect(orders).toEqual([...orders].sort((left, right) => left - right));
  });

  it("rejects Pattern bead-count reconciliation failures", () => {
    const context = replayContext(40);
    const first = context.pattern.colors[0]!;
    expect(() =>
      createE05ProductionRunEvidence({
        declaration,
        replay: context.replay,
        pattern: {
          ...context.pattern,
          colors: Object.freeze([
            { ...first, beadCount: first.beadCount + 1 },
            ...context.pattern.colors.slice(1),
          ]),
        },
        palette: dependencies.palette,
        colorSets: dependencies.colorSets,
      }),
    ).toThrow(/reconciliation/);
  });

  it("rejects duplicate final Pattern codes", () => {
    const context = replayContext(40);
    expect(() =>
      createE05ProductionRunEvidence({
        declaration,
        replay: context.replay,
        pattern: {
          ...context.pattern,
          colors: Object.freeze([
            ...context.pattern.colors,
            context.pattern.colors[0]!,
          ]),
        },
        palette: dependencies.palette,
        colorSets: dependencies.colorSets,
      }),
    ).toThrow(/duplicate/);
  });

  it("rejects final Pattern codes outside the Runtime Palette", () => {
    const context = replayContext(40);
    const first = context.pattern.colors[0]!;
    expect(() =>
      createE05ProductionRunEvidence({
        declaration,
        replay: context.replay,
        pattern: {
          ...context.pattern,
          colors: Object.freeze([
            { ...first, color: { ...first.color, code: "UNKNOWN" } },
            ...context.pattern.colors.slice(1),
          ]),
        },
        palette: dependencies.palette,
        colorSets: dependencies.colorSets,
      }),
    ).toThrow(/invalid color row/);
  });

  it("records coverage for every approved profile", () => {
    const required = createRequiredBeadSetEvidence(
      ["A4", "A10"],
      dependencies.colorSets,
      paletteOrder,
    );
    expect(required.coverage).toHaveLength(6);
    expect(required.coverage.map((item) => item.profileSize)).toEqual([
      24, 48, 72, 120, 168, 221,
    ]);
  });

  it("sorts missing codes by Runtime Palette order", () => {
    const required = createRequiredBeadSetEvidence(
      ["A20", "A10", "A3"],
      dependencies.colorSets,
      paletteOrder,
    );
    const missing = required.coverage[0]!.missingCodes;
    const orders = missing.map((code) => paletteOrder.get(code)!);
    expect(orders).toEqual([...orders].sort((left, right) => left - right));
  });

  it.each([
    ["A4", 24],
    ["A10", 48],
    ["A3", 72],
    ["A1", 120],
    ["A2", 168],
    ["A20", 221],
  ] as const)("selects the smallest complete profile for %s", (code, size) => {
    expect(
      createRequiredBeadSetEvidence(
        [code],
        dependencies.colorSets,
        paletteOrder,
      ).profileSize,
    ).toBe(size);
  });

  it("fails when the 221 profile cannot provide complete coverage", () => {
    const profiles = dependencies.colorSets.profiles.map((profile) =>
      profile.size === 221
        ? Object.freeze({
            ...profile,
            memberCodes: Object.freeze(
              profile.memberCodes.map((code) => (code === "A20" ? "Z1" : code)),
            ),
          })
        : profile,
    );
    expect(() =>
      createRequiredBeadSetEvidence(
        ["A20"],
        { ...dependencies.colorSets, profiles },
        paletteOrder,
      ),
    ).toThrow(/221 profile/);
  });

  it("reconciles the Required Set distribution to the run count", () => {
    const evidence = evidenceFixture();
    expect(
      Object.values(evidence.aggregates.requiredBeadSetDistribution).reduce(
        (sum, count) => sum + count,
        0,
      ),
    ).toBe(4);
  });

  it("uses smaller minus larger as the transition improvement sign", () => {
    const run = productionRun(40);
    const input = run.profileQuality.map((profile, index) => ({
      ...profile,
      weightedMeanPaletteDeltaE00: 6 - index,
      weightedP95PaletteDeltaE00: 12 - index * 2,
      maximumPaletteDeltaE00: 18 - index * 3,
      usedColorCount: index + 1,
    }));
    expect(createProfileTransitions(input)[0]).toMatchObject({
      weightedMeanPaletteDeltaE00Improvement: 1,
      weightedP95PaletteDeltaE00Improvement: 2,
      maximumPaletteDeltaE00Improvement: 3,
      usedColorCountChange: 1,
    });
  });

  it("calculates deterministic whole-corpus aggregates", () => {
    const aggregate = evidenceFixture().aggregates.wholeCorpus;
    expect(aggregate.runCount).toBe(4);
    expect(aggregate.profiles).toHaveLength(6);
    expect(aggregate.transitions).toHaveLength(5);
  });

  it("groups trusted pairs without adding production runs", () => {
    const evidence = evidenceFixture();
    expect(evidence.runs).toHaveLength(4);
    expect(evidence.aggregates.trustedPairs).toHaveLength(1);
    expect(evidence.aggregates.trustedPairs[0]!.runIds).toHaveLength(4);
  });

  it("serializes canonically regardless of input run order", () => {
    const left = evidenceFixture(false);
    const right = evidenceFixture(true);
    expect(serializeE05ProductionEvidence(left)).toBe(
      serializeE05ProductionEvidence(right),
    );
  });

  it("produces a deterministic canonical evidence hash", () => {
    expect(evidenceFixture().canonicalEvidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(evidenceFixture().canonicalEvidenceSha256).toBe(
      evidenceFixture().canonicalEvidenceSha256,
    );
  });

  it("rejects candidate diagnostics", () => {
    const context = replayContext(40);
    expect(() =>
      assertNoCandidateDiagnostics({
        ...context.replay.diagnostics,
        h03Candidate: {
          activated: true,
          bypassReason: "none",
          candidateCount: 1,
          removedCount: 1,
          topologyGuardRejected: false,
          componentCountBefore: 1,
          componentCountAfter: 1,
        },
      }),
    ).toThrow(/candidate diagnostics/);
  });
});

function replayContext(size: 40 | 60 | 80 | 104) {
  const fixture = createSyntheticGeneratorQualityFixture(
    declaration.input.logicalId,
  );
  const replay = replaySyntheticQualityCase(
    declaration,
    fixture,
    "white",
    size,
    dependencies,
  );
  return { replay: replay.result, pattern: replay.artifacts.pattern };
}

function trustedDeclaration(): GeneratorQualityCaseDeclaration {
  return Object.freeze({
    ...declaration,
    reference: Object.freeze({
      type: "trusted-alpha-pair" as const,
      input: Object.freeze({
        logicalId: "trusted/reference.png",
        sha256: "b".repeat(64),
        alphaClassification: "binary-alpha" as const,
      }),
      confidence: "exact" as const,
      provenance: "user-approved-curated-pair" as const,
    }),
  });
}

function productionRun(size: 40 | 60 | 80 | 104): E05ProductionRunEvidence {
  const context = replayContext(size);
  return createE05ProductionRunEvidence({
    declaration: trustedDeclaration(),
    replay: context.replay,
    pattern: context.pattern,
    palette: dependencies.palette,
    colorSets: dependencies.colorSets,
  });
}

function evidenceFixture(reverse = false) {
  const runs = ([40, 60, 80, 104] as const).map(productionRun);
  if (reverse) runs.reverse();
  return createE05ProductionEvidence({
    productionIdentity: productionIdentity(),
    corpusIdentity: Object.freeze({
      version: "test",
      manifestSha256: "a".repeat(64),
      logicalCaseCount: 1,
      physicalInputCount: 2,
      trustedPairCount: 1,
      runCount: 4,
    }),
    colorSets: dependencies.colorSets,
    frozenBaselineCanonicalSha256: "c".repeat(64),
    runs,
  });
}

function productionIdentity(): E05ProductionIdentity {
  return Object.freeze({
    gitCommit: "d".repeat(40),
    pipeline: "production-baseline",
    sampling: "area-average",
    backgroundRemoval: "Background Removal v1 — Conservative",
    processingPolicy: Object.freeze({ id: "policy", version: "1.0.0" }),
    runtimePaletteArtifactSha256: "1".repeat(64),
    runtimePaletteLockSha256: "2".repeat(64),
    colorSetArtifactSha256: "3".repeat(64),
    colorSetLockSha256: "4".repeat(64),
    boardProfile: Object.freeze({
      id: "board",
      version: "1.0.0",
      artifactSha256: "5".repeat(64),
    }),
  });
}
