import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import type { GenerationRuntime } from "../../features/generator/generation.types";
import { useGeneratorController } from "../../features/generator/use-generator-controller";
import {
  CONTROLLED_GENERATION_CONSUMPTION_SCOPE,
  createControlledGenerationSession,
  downloadPatternCostingArtifact,
  type ControlledGenerationEvidenceSnapshot,
  type ControlledGenerationOperatorRuntime,
  type ControlledGenerationSession,
} from "../../features/pattern-costing";
import type { PatternCostingArtifact } from "../../features/pattern-costing/pattern-costing-export";
import type { PatternSettingsDraft } from "../../features/settings/settings.types";

const INITIAL_SETTINGS: PatternSettingsDraft = Object.freeze({
  width: "80",
  height: "80",
  maxColors: "32",
  background: "white",
  selectedColorSetProfileId: "poparooz-set-221",
});

export interface ControlledGenerationOperatorProps {
  readonly operatorRuntime: ControlledGenerationOperatorRuntime;
  readonly generationRuntime: GenerationRuntime;
}

export function ControlledGenerationOperator({
  operatorRuntime,
  generationRuntime,
}: ControlledGenerationOperatorProps) {
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [assertionId, setAssertionId] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [settings, setSettings] =
    useState<PatternSettingsDraft>(INITIAL_SETTINGS);
  const [session, setSession] = useState<ControlledGenerationSession | null>(
    null,
  );
  const [snapshot, setSnapshot] =
    useState<ControlledGenerationEvidenceSnapshot | null>(null);
  const [artifact, setArtifact] = useState<PatternCostingArtifact | null>(null);
  const [binding, setBinding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const profiles =
    generationRuntime.availability.available &&
    "colorSetProfiles" in generationRuntime
      ? generationRuntime.colorSetProfiles
      : [];
  const patternCosting = useMemo(
    () =>
      session === null
        ? ({ mode: "disabled" } as const)
        : ({ mode: "controlled", session } as const),
    [session],
  );
  const generator = useGeneratorController({
    file: sourceFile,
    imageVersion,
    settings,
    runtime: generationRuntime,
    patternCosting,
  });

  const refreshHandoff = async (activeSession = session) => {
    if (activeSession === null) return;
    try {
      const evidence = await activeSession.exportEvidence();
      setSnapshot(evidence);
      setArtifact(activeSession.getSuccessfulArtifact());
    } catch {
      setMessage(
        "Evidence could not be prepared. The attempt remains consumed.",
      );
    }
  };

  useEffect(() => {
    if (
      session === null ||
      !["success", "error", "aborted", "dirty"].includes(generator.state.status)
    )
      return;
    let cancelled = false;
    let timer = 0;
    let attempts = 0;
    const poll = async () => {
      try {
        const evidence = await session.exportEvidence();
        if (cancelled) return;
        const nextArtifact = session.getSuccessfulArtifact();
        setSnapshot(evidence);
        setArtifact(nextArtifact);
        const terminal = evidence.events.some((event) =>
          ["SUCCEEDED", "FAILED", "ABORTED", "INPUT_DIRTY"].includes(
            event.eventType,
          ),
        );
        if (!terminal && attempts < 40) {
          attempts += 1;
          timer = window.setTimeout(() => void poll(), 50);
        }
      } catch {
        if (!cancelled)
          setMessage(
            "Evidence could not be prepared. The attempt remains consumed.",
          );
      }
    };
    timer = window.setTimeout(() => void poll(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [generator.state.status, session]);

  const bindAuthority = async () => {
    if (manifestFile === null || assertionId.trim() === "") {
      setMessage("Choose a manifest and enter its exact assertion ID.");
      return;
    }
    setBinding(true);
    setMessage(null);
    setSnapshot(null);
    setArtifact(null);
    try {
      const bytes = new Uint8Array(await manifestFile.arrayBuffer());
      const nextSession = await createControlledGenerationSession(
        operatorRuntime,
        bytes,
        assertionId.trim(),
      );
      setSession(nextSession);
      setMessage(
        nextSession.canStart()
          ? "Authority bound. This attempt is ready."
          : "Authority bound, but this attempt was already consumed in this runtime.",
      );
    } catch {
      setSession(null);
      setMessage(
        "Authority binding failed closed. Check the manifest and assertion ID.",
      );
    } finally {
      setBinding(false);
    }
  };

  const selectSource = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.files?.[0] ?? null;
    setSourceFile(next);
    setImageVersion((version) => version + 1);
    setSnapshot(null);
    setArtifact(null);
  };

  const canStart =
    session !== null &&
    session.canStart() &&
    (generator.canGenerate || generator.canRegenerate);
  const authority = session?.authority;

  return (
    <main className="operator-shell">
      <header className="operator-header">
        <p className="eyebrow">Poparooz internal operator</p>
        <h1>Controlled generation</h1>
        <p>
          Bind one approved manifest assertion to one local generation attempt.
          Images and artifacts stay in this browser session.
        </p>
      </header>

      <section className="operator-card" aria-labelledby="authority-title">
        <div className="step-heading">
          <span>1</span>
          <div>
            <h2 id="authority-title">Bind authority</h2>
            <p>Use the exact assertion ID supplied with the manifest.</p>
          </div>
        </div>
        <div className="field-grid">
          <label>
            Controlled generation manifest
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) =>
                setManifestFile(event.currentTarget.files?.[0] ?? null)
              }
            />
            <span className="hint">Local JSON file; it is not uploaded.</span>
          </label>
          <label>
            Assertion ID
            <input
              value={assertionId}
              onChange={(event) => setAssertionId(event.currentTarget.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void bindAuthority()}
          disabled={binding}
        >
          {binding ? "Binding…" : "Bind manifest assertion"}
        </button>
        {message ? (
          <p className="operator-status" role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
      </section>

      {authority ? (
        <section className="operator-card" aria-labelledby="identity-title">
          <div className="step-heading">
            <span aria-hidden="true">✓</span>
            <div>
              <h2 id="identity-title">Bound identity</h2>
              <p>Read-only values from the validated authority.</p>
            </div>
          </div>
          <dl className="identity-grid">
            <Identity
              label="Manifest digest"
              value={authority.manifestDigest}
            />
            <Identity label="Batch ID" value={authority.manifest.batchId} />
            <Identity
              label="Assertion ID"
              value={authority.assertion.assertionId}
            />
            <Identity
              label="Generation attempt ID"
              value={authority.assertion.generationAttemptId}
            />
            <Identity
              label="Product key"
              value={authority.assertion.productKey}
            />
            <Identity
              label="Target table"
              value={authority.assertion.targetTableId}
            />
            <Identity
              label="Target record"
              value={authority.assertion.targetRecordId}
            />
            <Identity
              label="Implementation authority"
              value={authority.generatorImplementationAuthorityId}
            />
          </dl>
          <p className="scope-note">
            Consumption scope: {CONTROLLED_GENERATION_CONSUMPTION_SCOPE}.
          </p>
        </section>
      ) : null}

      <section className="operator-card" aria-labelledby="input-title">
        <div className="step-heading">
          <span>2</span>
          <div>
            <h2 id="input-title">Prepare local input</h2>
            <p>
              Choose an image and generation settings after authority is bound.
            </p>
          </div>
        </div>
        <div className="field-grid">
          <label>
            Source image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectSource}
            />
            <span className="hint">
              Processed locally; never uploaded by this operator.
            </span>
          </label>
          <label>
            Pattern size
            <select
              value={settings.width}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  width: event.currentTarget.value,
                  height: event.currentTarget.value,
                }))
              }
            >
              {[40, 60, 80, 104].map((size) => (
                <option key={size} value={size}>{`${size} × ${size}`}</option>
              ))}
            </select>
          </label>
          <label>
            Maximum colors
            <input
              type="number"
              min="1"
              max="221"
              value={settings.maxColors}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  maxColors: event.currentTarget.value,
                }))
              }
            />
          </label>
          <label>
            Background
            <select
              value={settings.background}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  background: event.currentTarget.value as
                    "white" | "transparent",
                }))
              }
            >
              <option value="white">White</option>
              <option value="transparent">Transparent</option>
            </select>
          </label>
          <label>
            Published color set
            <select
              value={settings.selectedColorSetProfileId}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  selectedColorSetProfileId: event.currentTarget
                    .value as PatternSettingsDraft["selectedColorSetProfileId"],
                }))
              }
            >
              {profiles.map((profile) => (
                <option key={profile.profileId} value={profile.profileId}>
                  {profile.size}-color set
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="operator-card" aria-labelledby="run-title">
        <div className="step-heading">
          <span>3</span>
          <div>
            <h2 id="run-title">Run once and hand off</h2>
            <p>
              The attempt is consumed before the generation service is invoked.
            </p>
          </div>
        </div>
        {!generationRuntime.availability.available ? (
          <p role="alert">The approved generation runtime is unavailable.</p>
        ) : null}
        <div className="action-row">
          <button
            type="button"
            onClick={() => generator.generate()}
            disabled={!canStart}
          >
            Generate controlled pattern
          </button>
          {generator.state.status === "processing" ? (
            <button
              type="button"
              className="secondary"
              onClick={generator.abort}
            >
              Abort
            </button>
          ) : null}
          <button
            type="button"
            className="secondary"
            disabled={session === null}
            onClick={() => void refreshHandoff()}
          >
            Refresh evidence
          </button>
        </div>
        <p className="operator-status" role="status" aria-live="polite">
          Lifecycle: {generator.state.status}. Attempt:{" "}
          {session?.canStart()
            ? "ready"
            : session
              ? "consumed — new COST authority required"
              : "not bound"}
          .
        </p>

        {snapshot ? (
          <div className="handoff-panel">
            <h3>Evidence snapshot</h3>
            <p>{snapshot.events.length} ordered event(s)</p>
            <code>{snapshot.evidenceChecksum}</code>
            <ol>
              {snapshot.events.map((event) => (
                <li key={event.sequence}>{event.eventType}</li>
              ))}
            </ol>
            <button
              type="button"
              className="secondary"
              onClick={() => downloadEvidence(snapshot)}
            >
              Download evidence JSON
            </button>
          </div>
        ) : null}

        {artifact ? (
          <div className="handoff-panel">
            <h3>PatternCosting artifact</h3>
            <p>Export {artifact.payload.exportId}</p>
            <code>{artifact.payload.payloadChecksum}</code>
            <button
              type="button"
              onClick={() => downloadPatternCostingArtifact(artifact)}
            >
              Download PatternCosting artifact
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Identity({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function downloadEvidence(
  snapshot: ControlledGenerationEvidenceSnapshot,
): void {
  const blob = new Blob([snapshot.serialized], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `controlled-generation-evidence-${snapshot.events[0]?.identity.generationAttemptId ?? "empty"}.json`;
    anchor.rel = "noopener";
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
