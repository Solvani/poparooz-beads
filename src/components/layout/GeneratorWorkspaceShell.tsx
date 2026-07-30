import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

export function GeneratorWorkspaceShell() {
  return (
    <main className="workspace-shell" aria-label="Pattern maker workspace">
      <Panel
        title="Start with an image"
        titleId="create-heading"
        eyebrow="Create"
        className="workspace-shell__settings"
      >
        <p>Upload and pattern controls will appear here.</p>
      </Panel>

      <Panel
        title="Your pattern will appear here."
        titleId="canvas-heading"
        eyebrow="Pattern Canvas"
        className="workspace-shell__canvas panel--canvas"
      >
        <div className="empty-state">
          <p>Upload an image and generate a pattern to begin.</p>
        </div>
      </Panel>

      <Panel
        as="aside"
        title="Your pattern details will appear here."
        titleId="summary-heading"
        eyebrow="Pattern Summary"
        className="workspace-shell__results"
      >
        <section className="summary-section" aria-labelledby="colors-heading">
          <h3 id="colors-heading">Colors</h3>
          <p>Color quantities will appear after generation.</p>
        </section>
        <section className="summary-section" aria-labelledby="boards-heading">
          <h3 id="boards-heading">Board Layout</h3>
          <p>Board placement will appear after generation.</p>
        </section>
        <section
          className="summary-section action-placeholder"
          aria-label="Future actions"
        >
          <Button disabled>Download Pattern</Button>
          <Button disabled variant="secondary">
            Get Beads for This Pattern
          </Button>
          <p className="action-placeholder__note">Coming later</p>
        </section>
      </Panel>

      <div className="workspace-shell__mobile-entry" aria-hidden="true">
        Mobile workspace controls will appear here later.
      </div>
    </main>
  );
}
