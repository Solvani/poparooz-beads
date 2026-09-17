import type { GeneratorState } from "../generator/generator-state";
import { canonicalJson, domainSeparatedDigest } from "./canonical-json";
import { fail } from "./pattern-costing-error";
import { assertBoundControlledGenerationAuthority } from "./manifest";
import { validateAndCanonicalizePattern } from "./pattern-canonicalization";
import { assertPatternCostingRuntimeAuthority } from "./runtime-authority";
import type {
  PatternCostingExportV21,
  PatternCostingAttemptContext,
} from "./pattern-costing.types";

export interface CreatePatternCostingExportOptions {
  readonly exportId?: string;
  readonly exportedAt?: string;
}

export interface PatternCostingArtifact {
  readonly payload: PatternCostingExportV21;
  readonly serialized: string;
  readonly bytes: Uint8Array;
  readonly blob: Blob;
  readonly filename: string;
}

export async function createPatternCostingExportV21(
  state: GeneratorState,
  options: CreatePatternCostingExportOptions = {},
): Promise<PatternCostingArtifact> {
  if (state.status !== "success")
    fail("QUARANTINE_GENERATION_ATTEMPT_NOT_CURRENT_SUCCESS");
  const context = state.lastSuccess.snapshot.patternCosting;
  if (context === undefined)
    fail("QUARANTINE_GENERATION_ATTEMPT_NOT_CURRENT_SUCCESS");
  await validateAttemptContext(context);
  const integrity = await validateAndCanonicalizePattern(
    state.lastSuccess.result,
    context.runtimeAuthority,
  );
  const authority = context.authority;
  const runtime = context.runtimeAuthority;
  const assertion = authority.assertion;
  const exportId = options.exportId ?? crypto.randomUUID();
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      exportId,
    ) ||
    !isDateTime(exportedAt)
  )
    fail("QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION");
  const finalProjection = {
    contractVersion: "2.1.0",
    productKey: assertion.productKey,
    assertionId: assertion.assertionId,
    generationAttemptId: assertion.generationAttemptId,
    patternCanonicalizationVersion: "PatternCanonicalizationV1",
    patternHash: integrity.patternHash,
    width: state.lastSuccess.result.matrix.width,
    height: state.lastSuccess.result.matrix.height,
    totalBeads: integrity.totalBeads,
    perColorBeadCounts: integrity.perColorBeadCounts,
    colorRegistryId: runtime.colorRegistryId,
    colorRegistryVersion: runtime.colorRegistryVersion,
    colorRegistryDigest: runtime.colorRegistryDigest,
    generationColorSetProfileId: runtime.generationColorSetProfileId,
    generationColorSetProfileSize: runtime.generationColorSetProfileSize,
    generationColorSetProfileDigest: runtime.generationColorSetProfileDigest,
    boardProfileId: runtime.boardProfileId,
    boardProfileVersion: runtime.boardProfileVersion,
    processingPolicyId: runtime.processingPolicyId,
    processingPolicyVersion: runtime.processingPolicyVersion,
    generatorImplementationAuthorityId:
      authority.generatorImplementationAuthorityId,
  } as const;
  const finalSnapshotDigest = await domainSeparatedDigest(
    "POPAROOZ:FINAL-SNAPSHOT:V2",
    finalProjection,
  );
  const exportWithoutChecksum = {
    contractVersion: "2.1.0",
    exportId,
    generatedAt: context.generatedAt,
    exportedAt,
    manifestBinding: {
      manifestVersion: "ControlledGenerationManifestV2",
      batchId: authority.manifest.batchId,
      manifestDigest: authority.manifestDigest,
    },
    productAuthorityAssertion: assertion,
    generationAttempt: {
      generationAttemptId: assertion.generationAttemptId,
      resultState: "SUCCEEDED",
      authorityState: "CURRENT",
      inputState: "CLEAN",
      regenerationState: "IDLE",
    },
    snapshot: {
      patternCanonicalizationVersion: "PatternCanonicalizationV1",
      patternHash: integrity.patternHash,
      finalSnapshotDigest,
      width: finalProjection.width,
      height: finalProjection.height,
    },
    beadCounts: {
      totalBeads: integrity.totalBeads,
      perColorBeadCounts: integrity.perColorBeadCounts,
    },
    colorAuthority: {
      colorRegistryId: runtime.colorRegistryId,
      colorRegistryVersion: runtime.colorRegistryVersion,
      colorRegistryDigest: runtime.colorRegistryDigest,
      generationColorSetProfileId: runtime.generationColorSetProfileId,
      generationColorSetProfileSize: runtime.generationColorSetProfileSize,
      generationColorSetProfileDigest: runtime.generationColorSetProfileDigest,
    },
    boardAuthority: {
      boardProfileId: runtime.boardProfileId,
      boardProfileVersion: runtime.boardProfileVersion,
    },
    processingPolicyId: runtime.processingPolicyId,
    processingPolicyVersion: runtime.processingPolicyVersion,
    generatorImplementationAuthorityId:
      authority.generatorImplementationAuthorityId,
    localValidation: {
      validationContractVersion: "PatternCostingExportV2LocalValidationV1",
      matrixRecountBoundary: "PATTERNCOSTING_INTERNAL_MATRIX_RECOUNT_BOUNDARY",
      matrixRecount: "PASS",
      materialsAuthority: "PublicPatternResult.materials",
      materialsConsistency: "PASS",
      prohibitedPayloadScan: "PASS",
    },
  } as const;
  assertNoProhibitedContent(exportWithoutChecksum);
  const payloadChecksum = await domainSeparatedDigest(
    "POPAROOZ:PATTERN-COSTING-EXPORT-PAYLOAD:V2",
    exportWithoutChecksum,
  );
  const payload = deepFreeze({
    ...exportWithoutChecksum,
    payloadChecksum,
  }) as PatternCostingExportV21;
  const serialized = canonicalJson(payload);
  const bytes = new TextEncoder().encode(serialized);
  return Object.freeze({
    payload,
    serialized,
    bytes,
    blob: new Blob([bytes], { type: "application/json;charset=utf-8" }),
    filename: `poparooz-pattern-costing-${payload.exportId}.json`,
  });
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

async function validateAttemptContext(
  context: PatternCostingAttemptContext,
): Promise<void> {
  await assertBoundControlledGenerationAuthority(context.authority);
  assertPatternCostingRuntimeAuthority(context.runtimeAuthority);
  if (
    context.authority.assertion.generationAttemptId === "" ||
    !isDateTime(context.generatedAt)
  )
    fail("QUARANTINE_GENERATION_ATTEMPT_NOT_CURRENT_SUCCESS");
}

function isDateTime(value: string): boolean {
  return (
    Number.isFinite(Date.parse(value)) &&
    /(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(value)
  );
}

const PROHIBITED_KEYS = new Set([
  "sourceimage",
  "originalimage",
  "normalizedimage",
  "normalizedsourceimagehash",
  "pattern",
  "patternmatrix",
  "patternrows",
  "preview",
  "previewurl",
  "png",
  "canvasdata",
  "trustedgeneratorattestation",
  "signature",
  "keyid",
  "publickey",
  "privatekey",
  "finalsnapshotsequence",
  "resultauthorityrevision",
  "operatorpii",
  "customerpii",
  "secrets",
  "credentials",
]);

function assertNoProhibitedContent(value: unknown): void {
  const visit = (current: unknown): void => {
    if (current === null || typeof current !== "object") return;
    if (ArrayBuffer.isView(current) || current instanceof ArrayBuffer)
      fail("QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION");
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(current)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (PROHIBITED_KEYS.has(normalized))
        fail("QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION");
      visit(child);
    }
  };
  visit(value);
}
