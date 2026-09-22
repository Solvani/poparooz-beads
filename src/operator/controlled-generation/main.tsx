import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ControlledGenerationOperatorRuntime } from "../../features/pattern-costing";
import { bootstrapApprovedApplicationRuntime } from "../../runtime/bootstrap/application-runtime-bootstrap";
import { ControlledGenerationOperator } from "./ControlledGenerationOperator";
import "./operator.css";

const root = document.getElementById("root");
if (root === null)
  throw new Error("Controlled generation operator root is missing.");

const applicationRuntime = bootstrapApprovedApplicationRuntime();
const operatorRuntime = new ControlledGenerationOperatorRuntime();

createRoot(root).render(
  <StrictMode>
    <ControlledGenerationOperator
      operatorRuntime={operatorRuntime}
      generationRuntime={applicationRuntime.generationRuntime}
    />
  </StrictMode>,
);
