import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { bootstrapApprovedApplicationRuntime } from "./runtime/bootstrap/application-runtime-bootstrap";
import { startApplication } from "./runtime/bootstrap/application-startup";
import { UNAVAILABLE_EMAIL_GATE_CAPABILITY } from "./email-gate/email-gate-capability";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Application root element was not found.");
}

startApplication({
  bootstrap: bootstrapApprovedApplicationRuntime,
  render: (generationRuntime) => {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App
            generationRuntime={generationRuntime}
            emailGateCapability={UNAVAILABLE_EMAIL_GATE_CAPABILITY}
          />
        </ErrorBoundary>
      </StrictMode>,
    );
  },
});
