import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { bootstrapApprovedApplicationRuntime } from "./runtime/bootstrap/application-runtime-bootstrap";
import { startApplication } from "./runtime/bootstrap/application-startup";
import { startApplicationRoute } from "./runtime/bootstrap/application-route-startup";
import { createProductionEmailGateCapability } from "./email-gate/production-email-gate-capability";
import { createProductionMarketingConsentCapability } from "./marketing-consent/production-marketing-consent-capability";
import { MarketingWithdrawalPage } from "./marketing-consent/withdrawal/MarketingWithdrawalPage";
import { resolveProductionMarketingWithdrawalAvailability } from "./marketing-consent/withdrawal/marketing-withdrawal-availability";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Application root element was not found.");
}

const root = createRoot(rootElement);

startApplicationRoute({
  pathname: window.location.pathname,
  renderMarketingWithdrawal: () => {
    const availability = resolveProductionMarketingWithdrawalAvailability();
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <MarketingWithdrawalPage availability={availability} />
        </ErrorBoundary>
      </StrictMode>,
    );
  },
  startGenerator: () => {
    const emailGateCapability = createProductionEmailGateCapability();
    const marketingConsentCapability =
      createProductionMarketingConsentCapability();

    startApplication({
      bootstrap: bootstrapApprovedApplicationRuntime,
      render: (generationRuntime) => {
        root.render(
          <StrictMode>
            <ErrorBoundary>
              <App
                generationRuntime={generationRuntime}
                emailGateCapability={emailGateCapability}
                marketingConsentCapability={marketingConsentCapability}
              />
            </ErrorBoundary>
          </StrictMode>,
        );
      },
    });
  },
});
