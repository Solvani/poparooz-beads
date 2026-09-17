import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { GeneratorState } from "../generator/generator-state";
import type {
  BoundControlledGenerationAuthority,
  ControlledGenerationManifestV2,
  PatternCostingRuntimeAuthority,
} from "./pattern-costing.types";

export const ASSERTION_ID = "018f3b71-6f14-7d42-9e8a-3b2e179a8c11";
export const ATTEMPT_ID = "018f3b71-6f14-7d42-9e8a-3b2e179a8c12";
export const IMPLEMENTATION_AUTHORITY =
  "git:ec61d56f4db9e5957f415171635c6b01eb47e5b0";

export const MANIFEST: ControlledGenerationManifestV2 = {
  manifestVersion: "ControlledGenerationManifestV2",
  batchId: "018f3b71-6f14-7d42-9e8a-3b2e179a8c10",
  createdAt: "2026-09-11T00:00:00Z",
  targetTableId: "SYNTHETIC_NON_PRODUCTION",
  entries: [
    {
      manifestVersion: "ControlledGenerationManifestV2",
      batchId: "018f3b71-6f14-7d42-9e8a-3b2e179a8c10",
      assertionId: ASSERTION_ID,
      generationAttemptId: ATTEMPT_ID,
      productKey: "PK1_W05_SYNTHETIC_001",
      targetTableId: "SYNTHETIC_NON_PRODUCTION",
      targetRecordId: "SYNTHETIC_RECORD_001",
      observedProductSnapshotDigest:
        "sha256:c02eb78841be92ed3a188a66bbe71b964adff7b384fb73b228022aa9f682a9bb",
      entryState: "ACTIVE",
    },
  ],
  expectedGeneratorImplementationAuthorityId: IMPLEMENTATION_AUTHORITY,
};

export const RUNTIME_AUTHORITY: PatternCostingRuntimeAuthority = deepFreeze({
  colorRegistryId: "poparooz-standard",
  colorRegistryVersion: "1.0.0",
  colorRegistryDigest:
    "sha256:1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4",
  generationColorSetProfileId: "poparooz-set-221",
  generationColorSetProfileSize: 221,
  generationColorSetProfileDigest:
    "sha256:8097d031ba046eea3a3cc53ac373ce175a88a47060331ad0570835de14cb373f",
  generationColorSetMemberCodes: [
    "A1",
    ...Array.from({ length: 220 }, (_, index) => `Z${index + 1}`),
  ],
  boardProfileId: "poparooz-board-104",
  boardProfileVersion: "1.0.0",
  processingPolicyId: "poparooz-processing-policy",
  processingPolicyVersion: "1.1.0",
});

export function allA1Pattern(): PublicPatternResult {
  return {
    matrix: {
      width: 40,
      height: 40,
      colorIndices: new Uint16Array(1600),
      transparentIndex: 65535,
    },
    colors: [
      {
        index: 0,
        color: { brand: "Poparooz", code: "A1", hex: "#FFFFFF" },
        beadCount: 1600,
      },
    ],
    materials: [
      {
        patternColorIndex: 0,
        color: { brand: "Poparooz", code: "A1", hex: "#FFFFFF" },
        beadCount: 1600,
      },
    ],
    totals: {
      width: 40,
      height: 40,
      totalPositions: 1600,
      totalBeads: 1600,
      transparentPositions: 0,
      colorCount: 1,
    },
    boardLayout: {
      boardColumns: 1,
      boardRows: 1,
      boardCount: 1,
      boardWidthInBeads: 104,
      boardHeightInBeads: 104,
      totalPegCapacity: 10816,
      usedBeadCount: 1600,
      transparentPatternPositions: 0,
      outsidePatternPegCount: 9216,
      unusedPegCount: 9216,
      tiles: [],
    },
  };
}

export function successState(
  authority: BoundControlledGenerationAuthority,
  result: PublicPatternResult = allA1Pattern(),
): Extract<GeneratorState, { status: "success" }> {
  const candidate = {
    file: new File(["image"], "synthetic.png", { type: "image/png" }),
    imageVersion: 1,
    settings: {
      width: 40 as const,
      height: 40 as const,
      maxColors: 16,
      background: "white" as const,
      selectedColorSetProfileId: "poparooz-set-221" as const,
    },
    inputKey: "synthetic",
  };
  const snapshot = deepFreeze({
    ...candidate,
    jobId: 7,
    patternCosting: {
      authority,
      runtimeAuthority: RUNTIME_AUTHORITY,
      generatedAt: "2026-09-11T00:01:00Z",
    },
  });
  return {
    status: "success",
    input: { imageVersion: 1, candidate },
    lastSuccess: { snapshot, result },
  };
}

export function manifestBytes(value: unknown = MANIFEST): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
