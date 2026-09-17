import type { PublishedColorSetProfileId } from "../../runtime/color-set/color-set.types";

export type Sha256Digest = `sha256:${string}`;
export type GeneratorImplementationAuthorityId = `git:${string}`;

export interface ProductAuthorityAssertionV2 {
  readonly manifestVersion: "ControlledGenerationManifestV2";
  readonly batchId: string;
  readonly assertionId: string;
  readonly generationAttemptId: string;
  readonly productKey: string;
  readonly targetTableId: string;
  readonly targetRecordId: string;
  readonly observedProductSnapshotDigest: Sha256Digest;
  readonly entryState: "ACTIVE" | "SUPERSEDED" | "REVOKED";
}

export interface ControlledGenerationManifestV2 {
  readonly manifestVersion: "ControlledGenerationManifestV2";
  readonly batchId: string;
  readonly createdAt: string;
  readonly targetTableId: string;
  readonly expectedGeneratorImplementationAuthorityId: GeneratorImplementationAuthorityId;
  readonly entries: readonly ProductAuthorityAssertionV2[];
}

export interface BoundControlledGenerationAuthority {
  readonly manifest: ControlledGenerationManifestV2;
  readonly manifestDigest: Sha256Digest;
  readonly assertion: ProductAuthorityAssertionV2 & {
    readonly entryState: "ACTIVE";
  };
  readonly generatorImplementationAuthorityId: GeneratorImplementationAuthorityId;
}

export interface PatternCostingRuntimeAuthority {
  readonly colorRegistryId: "poparooz-standard";
  readonly colorRegistryVersion: "1.0.0";
  readonly colorRegistryDigest: Sha256Digest;
  readonly generationColorSetProfileId: PublishedColorSetProfileId;
  readonly generationColorSetProfileSize: 24 | 48 | 72 | 120 | 168 | 221;
  readonly generationColorSetProfileDigest: Sha256Digest;
  readonly generationColorSetMemberCodes: readonly string[];
  readonly boardProfileId: "poparooz-board-104";
  readonly boardProfileVersion: "1.0.0";
  readonly processingPolicyId: "poparooz-processing-policy";
  readonly processingPolicyVersion: "1.1.0";
}

export interface PatternCostingAttemptContext {
  readonly authority: BoundControlledGenerationAuthority;
  readonly runtimeAuthority: PatternCostingRuntimeAuthority;
  readonly generatedAt: string;
}

export type PatternCostingGenerationControl =
  | { readonly mode: "disabled" }
  | {
      readonly mode: "controlled";
      readonly authority: BoundControlledGenerationAuthority;
    };

export interface PerColorBeadCount {
  readonly colorId: string;
  readonly beadCount: number;
}

export interface PatternCostingExportV21 {
  readonly contractVersion: "2.1.0";
  readonly exportId: string;
  readonly generatedAt: string;
  readonly exportedAt: string;
  readonly manifestBinding: {
    readonly manifestVersion: "ControlledGenerationManifestV2";
    readonly batchId: string;
    readonly manifestDigest: Sha256Digest;
  };
  readonly productAuthorityAssertion: ProductAuthorityAssertionV2 & {
    readonly entryState: "ACTIVE";
  };
  readonly generationAttempt: {
    readonly generationAttemptId: string;
    readonly resultState: "SUCCEEDED";
    readonly authorityState: "CURRENT";
    readonly inputState: "CLEAN";
    readonly regenerationState: "IDLE";
  };
  readonly snapshot: {
    readonly patternCanonicalizationVersion: "PatternCanonicalizationV1";
    readonly patternHash: Sha256Digest;
    readonly finalSnapshotDigest: Sha256Digest;
    readonly width: 40 | 60 | 80 | 104;
    readonly height: 40 | 60 | 80 | 104;
  };
  readonly beadCounts: {
    readonly totalBeads: number;
    readonly perColorBeadCounts: readonly PerColorBeadCount[];
  };
  readonly colorAuthority: {
    readonly colorRegistryId: "poparooz-standard";
    readonly colorRegistryVersion: "1.0.0";
    readonly colorRegistryDigest: Sha256Digest;
    readonly generationColorSetProfileId: PublishedColorSetProfileId;
    readonly generationColorSetProfileSize: 24 | 48 | 72 | 120 | 168 | 221;
    readonly generationColorSetProfileDigest: Sha256Digest;
  };
  readonly boardAuthority: {
    readonly boardProfileId: "poparooz-board-104";
    readonly boardProfileVersion: "1.0.0";
  };
  readonly processingPolicyId: "poparooz-processing-policy";
  readonly processingPolicyVersion: "1.1.0";
  readonly generatorImplementationAuthorityId: GeneratorImplementationAuthorityId;
  readonly localValidation: {
    readonly validationContractVersion: "PatternCostingExportV2LocalValidationV1";
    readonly matrixRecountBoundary: "PATTERNCOSTING_INTERNAL_MATRIX_RECOUNT_BOUNDARY";
    readonly matrixRecount: "PASS";
    readonly materialsAuthority: "PublicPatternResult.materials";
    readonly materialsConsistency: "PASS";
    readonly prohibitedPayloadScan: "PASS";
  };
  readonly payloadChecksum: Sha256Digest;
}
