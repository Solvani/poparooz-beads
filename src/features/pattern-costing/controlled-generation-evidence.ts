import { canonicalJson, domainSeparatedDigest } from "./canonical-json";
import type {
  BoundControlledGenerationAuthority,
  GeneratorImplementationAuthorityId,
  Sha256Digest,
} from "./pattern-costing.types";

export const CONTROLLED_GENERATION_EVIDENCE_VERSION =
  "ControlledGenerationEvidenceV1" as const;

export type ControlledGenerationEvidenceEventType =
  | "GENERATION_STARTED"
  | "SUCCEEDED"
  | "FAILED"
  | "ABORTED"
  | "INPUT_DIRTY"
  | "REGENERATION_STARTED"
  | "REGENERATION_IDLE"
  | "STALE_CALLBACK_REJECTED"
  | "RETRY_AUTHORITY_REQUIRED";

export type ControlledGenerationFailureCode =
  | "unsupported-image"
  | "image-too-large"
  | "decode-failed"
  | "invalid-settings"
  | "generation-unavailable"
  | "worker-failed"
  | "pattern-failed"
  | "unknown"
  | "pattern-costing-artifact-invalid";

export interface ControlledGenerationEvidenceIdentity {
  readonly batchId: string;
  readonly assertionId: string;
  readonly generationAttemptId: string;
  readonly productKey: string;
  readonly targetTableId: string;
  readonly targetRecordId: string;
  readonly manifestDigest: Sha256Digest;
  readonly generatorImplementationAuthorityId: GeneratorImplementationAuthorityId;
}

export interface ControlledGenerationArtifactReference {
  readonly contractVersion: "2.1.0";
  readonly exportId: string;
  readonly generationAttemptId: string;
  readonly finalSnapshotDigest: Sha256Digest;
  readonly payloadChecksum: Sha256Digest;
}

export interface ControlledGenerationEvidenceEvent {
  readonly evidenceVersion: typeof CONTROLLED_GENERATION_EVIDENCE_VERSION;
  readonly sequence: number;
  readonly recordedAt: string;
  readonly eventType: ControlledGenerationEvidenceEventType;
  readonly identity: ControlledGenerationEvidenceIdentity;
  readonly errorCode?: ControlledGenerationFailureCode;
  readonly rejectedCallback?: "SUCCESS" | "FAILURE";
  readonly artifact?: ControlledGenerationArtifactReference;
  readonly evidenceChecksum: Sha256Digest;
}

export interface ControlledGenerationEvidenceSnapshot {
  readonly evidenceVersion: typeof CONTROLLED_GENERATION_EVIDENCE_VERSION;
  readonly events: readonly ControlledGenerationEvidenceEvent[];
  readonly evidenceChecksum: Sha256Digest;
  readonly serialized: string;
  readonly bytes: Uint8Array;
}

export interface ControlledGenerationEvidenceSink {
  append(event: ControlledGenerationEvidenceEvent): void | Promise<void>;
}

export type ControlledGenerationEvidenceDraft = Omit<
  ControlledGenerationEvidenceEvent,
  "evidenceVersion" | "sequence" | "identity" | "evidenceChecksum"
>;

export class ControlledGenerationEvidenceJournal implements ControlledGenerationEvidenceSink {
  readonly #events: ControlledGenerationEvidenceEvent[] = [];

  async append(event: ControlledGenerationEvidenceEvent): Promise<void> {
    assertClosedEvidenceEvent(event);
    const expectedSequence = this.#events.length + 1;
    if (event.sequence !== expectedSequence)
      throw new Error("Controlled generation evidence is out of order.");
    const { evidenceChecksum, ...projection } = event;
    const expectedChecksum = await domainSeparatedDigest(
      "POPAROOZ:CONTROLLED-GENERATION-EVIDENCE-EVENT:V1",
      projection,
    );
    if (evidenceChecksum !== expectedChecksum)
      throw new Error("Controlled generation evidence checksum is invalid.");
    this.#events.push(deepFreeze(structuredClone(event)));
  }

  getEvents(): readonly ControlledGenerationEvidenceEvent[] {
    return deepFreeze(structuredClone(this.#events));
  }

  async exportSnapshot(): Promise<ControlledGenerationEvidenceSnapshot> {
    const events = this.getEvents();
    const projection = {
      evidenceVersion: CONTROLLED_GENERATION_EVIDENCE_VERSION,
      events,
    } as const;
    const evidenceChecksum = await domainSeparatedDigest(
      "POPAROOZ:CONTROLLED-GENERATION-EVIDENCE-JOURNAL:V1",
      projection,
    );
    const payload = deepFreeze({ ...projection, evidenceChecksum });
    const serialized = canonicalJson(payload);
    return Object.freeze({
      ...payload,
      serialized,
      bytes: new TextEncoder().encode(serialized),
    });
  }
}

export function controlledGenerationEvidenceIdentity(
  authority: BoundControlledGenerationAuthority,
): ControlledGenerationEvidenceIdentity {
  const assertion = authority.assertion;
  return deepFreeze({
    batchId: authority.manifest.batchId,
    assertionId: assertion.assertionId,
    generationAttemptId: assertion.generationAttemptId,
    productKey: assertion.productKey,
    targetTableId: assertion.targetTableId,
    targetRecordId: assertion.targetRecordId,
    manifestDigest: authority.manifestDigest,
    generatorImplementationAuthorityId:
      authority.generatorImplementationAuthorityId,
  });
}

export async function createControlledGenerationEvidenceEvent(
  identity: ControlledGenerationEvidenceIdentity,
  sequence: number,
  draft: ControlledGenerationEvidenceDraft,
): Promise<ControlledGenerationEvidenceEvent> {
  assertDraft(draft);
  const projection = deepFreeze({
    evidenceVersion: CONTROLLED_GENERATION_EVIDENCE_VERSION,
    sequence,
    recordedAt: draft.recordedAt,
    eventType: draft.eventType,
    identity,
    ...(draft.errorCode === undefined ? {} : { errorCode: draft.errorCode }),
    ...(draft.rejectedCallback === undefined
      ? {}
      : { rejectedCallback: draft.rejectedCallback }),
    ...(draft.artifact === undefined ? {} : { artifact: draft.artifact }),
  });
  const evidenceChecksum = await domainSeparatedDigest(
    "POPAROOZ:CONTROLLED-GENERATION-EVIDENCE-EVENT:V1",
    projection,
  );
  return deepFreeze({ ...projection, evidenceChecksum });
}

const EVENT_TYPES = new Set<ControlledGenerationEvidenceEventType>([
  "GENERATION_STARTED",
  "SUCCEEDED",
  "FAILED",
  "ABORTED",
  "INPUT_DIRTY",
  "REGENERATION_STARTED",
  "REGENERATION_IDLE",
  "STALE_CALLBACK_REJECTED",
  "RETRY_AUTHORITY_REQUIRED",
]);

const FAILURE_CODES = new Set<ControlledGenerationFailureCode>([
  "unsupported-image",
  "image-too-large",
  "decode-failed",
  "invalid-settings",
  "generation-unavailable",
  "worker-failed",
  "pattern-failed",
  "unknown",
  "pattern-costing-artifact-invalid",
]);

function assertDraft(draft: ControlledGenerationEvidenceDraft): void {
  if (
    !EVENT_TYPES.has(draft.eventType) ||
    !Number.isFinite(Date.parse(draft.recordedAt)) ||
    !/(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(draft.recordedAt) ||
    (draft.errorCode !== undefined && !FAILURE_CODES.has(draft.errorCode)) ||
    (draft.rejectedCallback !== undefined &&
      draft.rejectedCallback !== "SUCCESS" &&
      draft.rejectedCallback !== "FAILURE") ||
    (draft.eventType === "FAILED") !== (draft.errorCode !== undefined) ||
    (draft.eventType === "STALE_CALLBACK_REJECTED") !==
      (draft.rejectedCallback !== undefined) ||
    (draft.eventType === "SUCCEEDED") !== (draft.artifact !== undefined)
  )
    throw new Error("Controlled generation evidence draft is invalid.");
}

function assertClosedEvidenceEvent(
  event: ControlledGenerationEvidenceEvent,
): void {
  const allowed = new Set([
    "evidenceVersion",
    "sequence",
    "recordedAt",
    "eventType",
    "identity",
    "errorCode",
    "rejectedCallback",
    "artifact",
    "evidenceChecksum",
  ]);
  if (
    Object.keys(event).some((key) => !allowed.has(key)) ||
    event.evidenceVersion !== CONTROLLED_GENERATION_EVIDENCE_VERSION ||
    !Number.isSafeInteger(event.sequence) ||
    event.sequence < 1 ||
    !/^sha256:[0-9a-f]{64}$/.test(event.evidenceChecksum)
  )
    throw new Error("Controlled generation evidence event is invalid.");
  const identityKeys = [
    "assertionId",
    "batchId",
    "generationAttemptId",
    "generatorImplementationAuthorityId",
    "manifestDigest",
    "productKey",
    "targetRecordId",
    "targetTableId",
  ];
  if (
    Object.keys(event.identity).sort().join("|") !== identityKeys.join("|") ||
    !/^sha256:[0-9a-f]{64}$/.test(event.identity.manifestDigest) ||
    !/^git:[0-9a-f]{40}$/.test(
      event.identity.generatorImplementationAuthorityId,
    )
  )
    throw new Error("Controlled generation evidence identity is invalid.");
  if (
    event.artifact !== undefined &&
    (Object.keys(event.artifact).sort().join("|") !==
      [
        "contractVersion",
        "exportId",
        "finalSnapshotDigest",
        "generationAttemptId",
        "payloadChecksum",
      ].join("|") ||
      event.artifact.contractVersion !== "2.1.0" ||
      event.artifact.generationAttemptId !==
        event.identity.generationAttemptId ||
      !/^sha256:[0-9a-f]{64}$/.test(event.artifact.finalSnapshotDigest) ||
      !/^sha256:[0-9a-f]{64}$/.test(event.artifact.payloadChecksum))
  )
    throw new Error("Controlled generation artifact reference is invalid.");
  assertDraft(event);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
