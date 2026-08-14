import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseGeneratorQualityManifest } from "./generator-quality-manifest.ts";
import {
  loadGeneratorQualityDependencies,
  replayExternalQualityCase,
  replaySyntheticQualityCase,
} from "./generator-quality-replay.ts";
import {
  createGeneratorQualityScorecard,
  generatorQualityExitCode,
  serializeGeneratorQualityScorecard,
} from "./generator-quality-scorecard.ts";
import { createSyntheticGeneratorQualityFixture } from "./generator-quality-synthetic.ts";
import type {
  GeneratorQualityBaselineIdentity,
  GeneratorQualityCaseResult,
} from "./generator-quality.types.ts";

const repositoryRoot = process.cwd();
const manifest = parseGeneratorQualityManifest(
  JSON.parse(
    readFileSync(
      path.join(
        repositoryRoot,
        "data-source/quality/generator-corpus/0.1.0/manifest.json",
      ),
      "utf8",
    ),
  ),
);
const dependencies = loadGeneratorQualityDependencies(repositoryRoot);

describe("generator quality production replay", () => {
  it.each([40, 60, 80, 104] as const)(
    "replays transparent and white production paths at %sx%s",
    (size) => {
      const declaration = manifest.cases.find(
        (item) => item.id === "transparent-png",
      )!;
      const fixture = createSyntheticGeneratorQualityFixture(
        declaration.input.logicalId,
      );
      for (const background of ["transparent", "white"] as const) {
        const replay = replaySyntheticQualityCase(
          declaration,
          fixture,
          background,
          size,
          dependencies,
        );
        expect(replay.result.metrics.pattern.totalPositions).toBe(size * size);
        expect(
          replay.result.metrics.pattern.totalBeads +
            replay.result.metrics.pattern.transparentPositions,
        ).toBe(size * size);
        expect(
          replay.result.metrics.color.map((item) => item.profileSize),
        ).toEqual([24, 48, 72, 120, 168, 221]);
        expect(
          replay.result.hardGates.every((gate) => gate.status === "passed"),
        ).toBe(true);
      }
    },
  );

  it("does not mutate explicit-alpha behavior during repeated replay", () => {
    const declaration = manifest.cases.find(
      (item) => item.id === "partial-alpha",
    )!;
    const fixture = createSyntheticGeneratorQualityFixture(
      declaration.input.logicalId,
    );
    const before = new Uint8ClampedArray(fixture.source.data);
    const first = replaySyntheticGeneratorCase(declaration, fixture);
    const second = replaySyntheticGeneratorCase(declaration, fixture);

    expect(fixture.source.data).toEqual(before);
    expect(first).toEqual(second);
  });

  it("replays an external trusted pair without embedding physical filenames", () => {
    const fixture = createSyntheticGeneratorQualityFixture("transparent-png");
    const declaration = {
      ...manifest.cases.find((item) => item.id === "opaque-white-background")!,
      id: "external-pair",
      sourceKind: "external-curated" as const,
      input: {
        logicalId: "pairs/example-opaque.png",
        sha256: "a".repeat(64),
        dimensions: {
          width: fixture.source.width,
          height: fixture.source.height,
        },
        alphaClassification: "opaque" as const,
      },
      reference: {
        type: "trusted-alpha-pair" as const,
        confidence: "strong" as const,
        provenance: "user-approved-curated-pair" as const,
        input: {
          logicalId: "pairs/example-transparent.png",
          sha256: "b".repeat(64),
          dimensions: {
            width: fixture.source.width,
            height: fixture.source.height,
          },
          alphaClassification: "binary-alpha" as const,
        },
      },
      supportedBackgrounds: ["transparent" as const],
      supportedPatternSizes: [104 as const],
    };
    const opaque = {
      ...fixture.source,
      data: new Uint8ClampedArray(fixture.source.data),
    };
    for (let index = 3; index < opaque.data.length; index += 4) {
      opaque.data[index] = 255;
    }

    const replay = replayExternalQualityCase(
      declaration,
      opaque,
      fixture.source,
      "transparent",
      104,
      dependencies,
    );

    expect(replay.result.sourceKind).toBe("external-curated");
    expect(replay.result.referenceType).toBe("trusted-alpha-pair");
    expect(replay.result.metrics.pattern.totalPositions).toBe(104 * 104);
  });
});

describe("generator quality scorecard", () => {
  it("sorts deterministically and excludes paths and timestamps", () => {
    const declaration = manifest.cases.find(
      (item) => item.id === "opaque-white-background",
    )!;
    const fixture = createSyntheticGeneratorQualityFixture(
      declaration.input.logicalId,
    );
    const first = replaySyntheticQualityCase(
      declaration,
      fixture,
      "transparent",
      40,
      dependencies,
    ).result;
    const second = replaySyntheticQualityCase(
      declaration,
      fixture,
      "transparent",
      60,
      dependencies,
    ).result;
    const left = serializeGeneratorQualityScorecard(
      createGeneratorQualityScorecard("synthetic", identity(), [second, first]),
    );
    const right = serializeGeneratorQualityScorecard(
      createGeneratorQualityScorecard("synthetic", identity(), [first, second]),
    );

    expect(left).toBe(right);
    expect(left.endsWith("\n")).toBe(true);
    expect(left).not.toMatch(/[A-Z]:\\|generatedAt|timestamp|machineName/i);
  });

  it("returns failure when a hard gate fails", () => {
    const failed = {
      ...minimalResult(),
      hardGates: [
        {
          id: "protected-component-deletion",
          status: "failed",
          actual: 1,
          expected: 0,
        },
      ],
    } satisfies GeneratorQualityCaseResult;
    const scorecard = createGeneratorQualityScorecard("synthetic", identity(), [
      failed,
    ]);
    expect(generatorQualityExitCode(scorecard)).toBe(1);
    expect(scorecard.overallSummary.failedGateCount).toBe(1);
  });
});

function replaySyntheticGeneratorCase(
  declaration: (typeof manifest.cases)[number],
  fixture: ReturnType<typeof createSyntheticGeneratorQualityFixture>,
) {
  return replaySyntheticQualityCase(
    declaration,
    fixture,
    "transparent",
    104,
    dependencies,
  ).result;
}

function identity(): GeneratorQualityBaselineIdentity {
  return {
    baselineId: "poparooz-generation-quality-baseline",
    baselineVersion: "development",
    gitCommit: "a".repeat(40),
    processingPolicy: {
      id: "poparooz-processing-policy",
      version: "1.1.0",
    },
    runtimePaletteArtifactSha256: "a".repeat(64),
    runtimePaletteLockSha256: "b".repeat(64),
    colorSetArtifactSha256: "c".repeat(64),
    colorSetLockSha256: "d".repeat(64),
    corpusManifestVersion: "0.1.0",
    corpusManifestSha256: "e".repeat(64),
    metricImplementationVersion: "1.1.0",
    scorecardSchemaVersion: "1.0.0",
  };
}

function minimalResult(): GeneratorQualityCaseResult {
  return {
    id: "case:transparent:40",
    category: "simple-graphic",
    tags: ["synthetic"],
    sourceKind: "synthetic",
    referenceType: "synthetic-mask",
    settings: {
      background: "transparent",
      size: 40,
      maxColors: 32,
      colorSetProfileId: "poparooz-set-221",
    },
    metrics: {
      background: {
        occupiedTruePositive: 1,
        falseBackgroundOccupied: 0,
        lostSubject: 0,
        occupancyDisagreementCount: 0,
        occupancyDisagreementRate: 0,
        candidateOnlyCount: 0,
        referenceOnlyCount: 0,
        candidateOccupiedCount: 1,
        referenceOccupiedCount: 1,
        candidateTransparentCount: 0,
        occupiedBoundingBox: null,
        referenceBoundingBox: null,
        boundingBoxIou: null,
        occupiedComponentCount: 1,
        referenceComponentCount: 1,
        deletedComponentCount: 0,
        splitComponentCount: 0,
        mergedComponentCount: 0,
        singletonCount: 1,
        smallIslandCount: 1,
        referenceEndpointCount: 0,
        retainedEndpointCount: 0,
        endpointLossCount: 0,
        thinFeatureContinuity: 1,
        beadCountDelta: 0,
        coverageWeightedAlphaAbsoluteDifference: 0,
      },
      pattern: {
        totalPositions: 1,
        totalBeads: 1,
        transparentPositions: 0,
        colorCount: 1,
      },
      color: [],
    },
    comparisonStatus: "not-compared",
    hardGates: [],
    improvementMetrics: {
      falseBackgroundOccupied: 0,
      lostSubject: 0,
      occupancyDisagreementCount: 0,
      singletonCount: 1,
    },
    diagnostics: {
      normalizedDrawWidth: 1,
      normalizedDrawHeight: 1,
      quantizedColorCount: 1,
    },
  };
}
