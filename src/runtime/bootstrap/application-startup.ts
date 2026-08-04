import type { GenerationRuntime } from "../../features/generator/generation.types";
import type { ApplicationRuntimeBootstrapResult } from "./application-runtime-bootstrap.types";

export interface ApplicationStartupDependencies {
  readonly bootstrap: () => ApplicationRuntimeBootstrapResult;
  readonly render: (generationRuntime: GenerationRuntime) => void;
}

export function startApplication(
  dependencies: ApplicationStartupDependencies,
): ApplicationRuntimeBootstrapResult {
  const bootstrapResult = dependencies.bootstrap();
  dependencies.render(bootstrapResult.generationRuntime);
  return bootstrapResult;
}
