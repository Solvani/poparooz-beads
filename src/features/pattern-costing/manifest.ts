import { z } from "zod";

import { canonicalJson, domainSeparatedDigest } from "./canonical-json";
import { fail } from "./pattern-costing-error";
import { parseAuthoritativeJsonBytes } from "./raw-json";
import type {
  BoundControlledGenerationAuthority,
  ControlledGenerationManifestV2,
  GeneratorImplementationAuthorityId,
  ProductAuthorityAssertionV2,
} from "./pattern-costing.types";

const uuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
const sha256 = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const implementationAuthority = z.string().regex(/^git:[0-9a-f]{40}$/);
const bounded = (maximum: number) => z.string().min(1).max(maximum);
const dateTime = z.string().refine((value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && /(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(value);
});

const assertionSchema = z
  .object({
    manifestVersion: z.literal("ControlledGenerationManifestV2"),
    batchId: uuid,
    assertionId: uuid,
    generationAttemptId: uuid,
    productKey: bounded(256),
    targetTableId: bounded(128),
    targetRecordId: bounded(128),
    observedProductSnapshotDigest: sha256,
    entryState: z.enum(["ACTIVE", "SUPERSEDED", "REVOKED"]),
  })
  .strict();

const manifestSchema = z
  .object({
    manifestVersion: z.literal("ControlledGenerationManifestV2"),
    batchId: uuid,
    createdAt: dateTime,
    targetTableId: bounded(128),
    expectedGeneratorImplementationAuthorityId: implementationAuthority,
    entries: z.array(assertionSchema).min(1),
  })
  .strict();

export interface BindControlledManifestOptions {
  readonly assertionId: string;
  readonly acceptedGeneratorImplementationAuthorityId: string | null;
}

export async function bindControlledGenerationManifest(
  rawBytes: Uint8Array,
  options: BindControlledManifestOptions,
): Promise<BoundControlledGenerationAuthority> {
  const accepted = options.acceptedGeneratorImplementationAuthorityId;
  if (accepted === null || accepted === "")
    fail("QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MISSING");
  if (!/^git:[0-9a-f]{40}$/.test(accepted))
    fail("QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MALFORMED");
  const parsed = manifestSchema.safeParse(
    parseAuthoritativeJsonBytes(rawBytes),
  );
  if (!parsed.success)
    fail("QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION", parsed.error);
  const manifest = parsed.data as ControlledGenerationManifestV2;
  validateManifestSemantics(manifest);
  if (manifest.expectedGeneratorImplementationAuthorityId !== accepted)
    fail("QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MISMATCH");
  const matches = manifest.entries.filter(
    (entry) => entry.assertionId === options.assertionId,
  );
  if (matches.length !== 1 || matches[0]!.entryState !== "ACTIVE")
    fail("QUARANTINE_PRODUCT_RESOLUTION_FAILURE");
  const assertion = matches[0] as ProductAuthorityAssertionV2 & {
    readonly entryState: "ACTIVE";
  };
  await validateObservedProductSnapshot(assertion);
  const manifestDigest = await domainSeparatedDigest(
    "POPAROOZ:CONTROLLED-GENERATION-MANIFEST:V2",
    manifest,
  );
  const frozenManifest = deepFreeze(structuredClone(manifest));
  const frozenAssertion = frozenManifest.entries.find(
    (entry) => entry.assertionId === assertion.assertionId,
  ) as typeof assertion;
  return Object.freeze({
    manifest: frozenManifest,
    manifestDigest,
    assertion: frozenAssertion,
    generatorImplementationAuthorityId:
      accepted as GeneratorImplementationAuthorityId,
  });
}

export async function assertBoundControlledGenerationAuthority(
  input: unknown,
): Promise<BoundControlledGenerationAuthority> {
  assertPrevalidatedBoundControlledGenerationAuthority(input);
  const authority = input;
  const expectedDigest = await domainSeparatedDigest(
    "POPAROOZ:CONTROLLED-GENERATION-MANIFEST:V2",
    authority.manifest,
  );
  if (expectedDigest !== authority.manifestDigest)
    fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
  await validateObservedProductSnapshot(authority.assertion);
  return authority;
}

export function assertPrevalidatedBoundControlledGenerationAuthority(
  input: unknown,
): asserts input is BoundControlledGenerationAuthority {
  if (!isRecord(input)) fail("QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION");
  const manifestResult = manifestSchema.safeParse(input.manifest);
  if (!manifestResult.success)
    fail("QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION", manifestResult.error);
  const authority = input as unknown as BoundControlledGenerationAuthority;
  if (!/^sha256:[0-9a-f]{64}$/.test(authority.manifestDigest))
    fail("QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION");
  if (!/^git:[0-9a-f]{40}$/.test(authority.generatorImplementationAuthorityId))
    fail("QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MALFORMED");
  validateManifestSemantics(authority.manifest);
  if (
    authority.manifest.expectedGeneratorImplementationAuthorityId !==
    authority.generatorImplementationAuthorityId
  )
    fail("QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MISMATCH");
  const matches = authority.manifest.entries.filter(
    (entry) => entry.assertionId === authority.assertion?.assertionId,
  );
  if (
    matches.length !== 1 ||
    matches[0]!.entryState !== "ACTIVE" ||
    canonicalJson(matches[0]) !== canonicalJson(authority.assertion)
  )
    fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
  if (!isDeepFrozen(authority)) fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
}

function validateManifestSemantics(
  manifest: ControlledGenerationManifestV2,
): void {
  const assertionIds = new Set<string>();
  const attemptIds = new Set<string>();
  const targets = new Set<string>();
  for (const entry of manifest.entries) {
    if (
      entry.manifestVersion !== manifest.manifestVersion ||
      entry.batchId !== manifest.batchId ||
      entry.targetTableId !== manifest.targetTableId
    )
      fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
    const target = `${entry.targetTableId}\u0000${entry.targetRecordId}`;
    if (
      assertionIds.has(entry.assertionId) ||
      attemptIds.has(entry.generationAttemptId) ||
      targets.has(target)
    )
      fail("QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION");
    assertionIds.add(entry.assertionId);
    attemptIds.add(entry.generationAttemptId);
    targets.add(target);
  }
}

async function validateObservedProductSnapshot(
  assertion: ProductAuthorityAssertionV2,
): Promise<void> {
  const digest = await domainSeparatedDigest(
    "POPAROOZ:OBSERVED-PRODUCT-AUTHORITY-SNAPSHOT:V2",
    {
      snapshotVersion: "ObservedProductAuthoritySnapshotV2",
      targetTableId: assertion.targetTableId,
      targetRecordId: assertion.targetRecordId,
      recordType: "PRODUCT",
      productKey: assertion.productKey,
    },
  );
  if (digest !== assertion.observedProductSnapshotDigest)
    fail("QUARANTINE_PRODUCT_RESOLUTION_FAILURE");
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function isDeepFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  if (!Object.isFrozen(value)) return false;
  return Object.values(value).every(isDeepFrozen);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
