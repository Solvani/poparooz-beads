import type { PatternCostingArtifact } from "./pattern-costing-export";
import {
  ControlledGenerationEvidenceJournal,
  controlledGenerationEvidenceIdentity,
  createControlledGenerationEvidenceEvent,
  type ControlledGenerationEvidenceDraft,
  type ControlledGenerationFailureCode,
  type ControlledGenerationEvidenceSink,
  type ControlledGenerationEvidenceSnapshot,
} from "./controlled-generation-evidence";
import type { BoundControlledGenerationAuthority } from "./pattern-costing.types";

export interface ControlledGenerationSessionOptions {
  readonly evidenceSink?: ControlledGenerationEvidenceSink;
  readonly now?: () => string;
}

export interface ControlledGenerationStart {
  readonly accepted: boolean;
  readonly evidenceReady: Promise<void>;
}

export interface ControlledGenerationSession {
  readonly authority: BoundControlledGenerationAuthority;
  canStart(): boolean;
  consumeAttempt(regeneration: boolean): ControlledGenerationStart;
  recordSucceeded(artifact: PatternCostingArtifact): Promise<boolean>;
  recordFailed(errorCode: ControlledGenerationFailureCode): Promise<void>;
  recordAborted(): Promise<void>;
  recordInputDirty(): Promise<void>;
  recordStaleCallback(callback: "SUCCESS" | "FAILURE"): Promise<void>;
  recordRegenerationIdle(): Promise<void>;
  getSuccessfulArtifact(): PatternCostingArtifact | null;
  exportEvidence(): Promise<ControlledGenerationEvidenceSnapshot>;
  flushEvidence(): Promise<void>;
}

export interface ControlledGenerationAttemptConsumptionRegistry {
  isConsumed(attemptKey: string): boolean;
  consume(attemptKey: string): boolean;
}

export function createRuntimeBackedControlledGenerationSession(
  authority: BoundControlledGenerationAuthority,
  consumptionRegistry: ControlledGenerationAttemptConsumptionRegistry,
  options: ControlledGenerationSessionOptions = {},
): ControlledGenerationSession {
  return new RuntimeBackedControlledGenerationSession(
    authority,
    consumptionRegistry,
    options,
  );
}

class RuntimeBackedControlledGenerationSession implements ControlledGenerationSession {
  readonly authority: BoundControlledGenerationAuthority;
  readonly #attemptKey: string;
  readonly #consumptionRegistry: ControlledGenerationAttemptConsumptionRegistry;
  readonly #journal = new ControlledGenerationEvidenceJournal();
  readonly #externalSink: ControlledGenerationEvidenceSink | undefined;
  readonly #now: () => string;
  #tail: Promise<void> = Promise.resolve();
  #deliveryError: unknown;
  #consumed = false;
  #terminal = false;
  #inputDirty = false;
  #retryRequired = false;
  #regenerationStarted = false;
  #regenerationIdle = false;
  #successfulArtifact: PatternCostingArtifact | null = null;

  constructor(
    authority: BoundControlledGenerationAuthority,
    consumptionRegistry: ControlledGenerationAttemptConsumptionRegistry,
    options: ControlledGenerationSessionOptions = {},
  ) {
    this.authority = authority;
    this.#attemptKey = controlledGenerationAttemptKey(authority);
    this.#consumptionRegistry = consumptionRegistry;
    this.#externalSink = options.evidenceSink;
    this.#now = options.now ?? (() => new Date().toISOString());
    Object.freeze(this);
  }

  canStart(): boolean {
    return (
      !this.#consumed && !this.#consumptionRegistry.isConsumed(this.#attemptKey)
    );
  }

  consumeAttempt(regeneration: boolean): ControlledGenerationStart {
    if (
      this.#consumed ||
      !this.#consumptionRegistry.consume(this.#attemptKey)
    ) {
      return {
        accepted: false,
        evidenceReady: this.#recordRetryAuthorityRequired(),
      };
    }
    this.#consumed = true;
    const started = this.#append({
      recordedAt: this.#timestamp(),
      eventType: "GENERATION_STARTED",
    });
    const evidenceReady = regeneration
      ? started.then(() => {
          this.#regenerationStarted = true;
          return this.#append({
            recordedAt: this.#timestamp(),
            eventType: "REGENERATION_STARTED",
          });
        })
      : started;
    return { accepted: true, evidenceReady };
  }

  recordSucceeded(artifact: PatternCostingArtifact): Promise<boolean> {
    if (this.#terminal || this.#inputDirty) return Promise.resolve(false);
    const payload = artifact.payload;
    const authority = this.authority;
    const assertion = authority.assertion;
    if (
      payload.manifestBinding.batchId !== authority.manifest.batchId ||
      payload.manifestBinding.manifestDigest !== authority.manifestDigest ||
      payload.productAuthorityAssertion.assertionId !== assertion.assertionId ||
      payload.productAuthorityAssertion.generationAttemptId !==
        assertion.generationAttemptId ||
      payload.productAuthorityAssertion.productKey !== assertion.productKey ||
      payload.productAuthorityAssertion.targetTableId !==
        assertion.targetTableId ||
      payload.productAuthorityAssertion.targetRecordId !==
        assertion.targetRecordId ||
      payload.generationAttempt.generationAttemptId !==
        assertion.generationAttemptId ||
      payload.generatorImplementationAuthorityId !==
        authority.generatorImplementationAuthorityId
    )
      throw new Error("Controlled generation artifact authority is invalid.");
    this.#terminal = true;
    const reference = Object.freeze({
      contractVersion: payload.contractVersion,
      exportId: payload.exportId,
      generationAttemptId: payload.generationAttempt.generationAttemptId,
      finalSnapshotDigest: payload.snapshot.finalSnapshotDigest,
      payloadChecksum: payload.payloadChecksum,
    });
    return this.#append({
      recordedAt: this.#timestamp(),
      eventType: "SUCCEEDED",
      artifact: reference,
    }).then(() => {
      this.#successfulArtifact = artifact;
      return true;
    });
  }

  recordFailed(errorCode: ControlledGenerationFailureCode): Promise<void> {
    if (this.#terminal) return this.#recordRetryAuthorityRequired();
    this.#terminal = true;
    return this.#append({
      recordedAt: this.#timestamp(),
      eventType: "FAILED",
      errorCode,
    }).then(() => this.#recordRetryAuthorityRequired());
  }

  recordAborted(): Promise<void> {
    if (this.#terminal) return this.#recordRetryAuthorityRequired();
    this.#terminal = true;
    return this.#append({
      recordedAt: this.#timestamp(),
      eventType: "ABORTED",
    }).then(() => this.#recordRetryAuthorityRequired());
  }

  recordInputDirty(): Promise<void> {
    if (this.#inputDirty) return this.#tail;
    this.#inputDirty = true;
    return this.#append({
      recordedAt: this.#timestamp(),
      eventType: "INPUT_DIRTY",
    }).then(() => this.#recordRetryAuthorityRequired());
  }

  recordStaleCallback(callback: "SUCCESS" | "FAILURE"): Promise<void> {
    return this.#append({
      recordedAt: this.#timestamp(),
      eventType: "STALE_CALLBACK_REJECTED",
      rejectedCallback: callback,
    });
  }

  recordRegenerationIdle(): Promise<void> {
    if (!this.#regenerationStarted || this.#regenerationIdle) return this.#tail;
    this.#regenerationIdle = true;
    return this.#append({
      recordedAt: this.#timestamp(),
      eventType: "REGENERATION_IDLE",
    });
  }

  getSuccessfulArtifact(): PatternCostingArtifact | null {
    return this.#successfulArtifact;
  }

  async exportEvidence(): Promise<ControlledGenerationEvidenceSnapshot> {
    await this.flushEvidence();
    return this.#journal.exportSnapshot();
  }

  async flushEvidence(): Promise<void> {
    await this.#tail;
    if (this.#deliveryError !== undefined)
      throw new Error("Controlled generation evidence delivery failed.", {
        cause: this.#deliveryError,
      });
  }

  #recordRetryAuthorityRequired(): Promise<void> {
    if (this.#retryRequired) return this.#tail;
    this.#retryRequired = true;
    return this.#append({
      recordedAt: this.#timestamp(),
      eventType: "RETRY_AUTHORITY_REQUIRED",
    });
  }

  #append(draft: ControlledGenerationEvidenceDraft): Promise<void> {
    const operation = this.#tail.then(async () => {
      const sequence = this.#journal.getEvents().length + 1;
      const event = await createControlledGenerationEvidenceEvent(
        controlledGenerationEvidenceIdentity(this.authority),
        sequence,
        draft,
      );
      await this.#journal.append(event);
      await this.#externalSink?.append(event);
    });
    this.#tail = operation.catch((error: unknown) => {
      this.#deliveryError ??= error;
    });
    return operation;
  }

  #timestamp(): string {
    const value = this.#now();
    if (
      !Number.isFinite(Date.parse(value)) ||
      !/(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(value)
    )
      throw new Error("Controlled generation evidence timestamp is invalid.");
    return value;
  }
}

function controlledGenerationAttemptKey(
  authority: BoundControlledGenerationAuthority,
): string {
  return [
    authority.manifestDigest,
    authority.assertion.assertionId,
    authority.assertion.generationAttemptId,
  ].join("|");
}
