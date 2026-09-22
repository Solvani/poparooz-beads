import { describe, expect, it } from "vitest";

import * as patternCostingPublicApi from "./index";
import * as controlledGenerationSessionModule from "./controlled-generation-session";
import {
  CONTROLLED_GENERATION_CONSUMPTION_SCOPE,
  ControlledGenerationOperatorRuntime,
  PATTERN_COSTING_SEMANTIC_AUTHORITY,
} from "./controlled-generation-operator-runtime";
import { ASSERTION_ID, MANIFEST, manifestBytes } from "./test-fixtures";

const authorizedManifest = () =>
  manifestBytes({
    ...MANIFEST,
    expectedGeneratorImplementationAuthorityId:
      PATTERN_COSTING_SEMANTIC_AUTHORITY,
  });

describe("ControlledGenerationOperatorRuntime", () => {
  it("does not expose a direct session construction bypass", () => {
    expect(patternCostingPublicApi).not.toHaveProperty(
      "ControlledGenerationSession",
    );
    expect(controlledGenerationSessionModule).not.toHaveProperty(
      "createRuntimeBackedControlledGenerationSession",
    );
  });

  it("documents and enforces one-shot consumption for its own lifetime", async () => {
    expect(CONTROLLED_GENERATION_CONSUMPTION_SCOPE).toBe(
      "one-shot within one live ControlledGenerationOperatorRuntime",
    );
    const runtime = new ControlledGenerationOperatorRuntime();
    const first = await runtime.createSession(
      authorizedManifest(),
      ASSERTION_ID,
    );
    expect(first.consumeAttempt(false).accepted).toBe(true);

    const rebound = await runtime.createSession(
      authorizedManifest(),
      ASSERTION_ID,
    );
    expect(rebound.canStart()).toBe(false);
    expect(rebound.consumeAttempt(false).accepted).toBe(false);
  });

  it("does not claim persistence beyond a live runtime", async () => {
    const firstRuntime = new ControlledGenerationOperatorRuntime();
    const first = await firstRuntime.createSession(
      authorizedManifest(),
      ASSERTION_ID,
    );
    expect(first.consumeAttempt(false).accepted).toBe(true);

    const replacementRuntime = new ControlledGenerationOperatorRuntime();
    const replacement = await replacementRuntime.createSession(
      authorizedManifest(),
      ASSERTION_ID,
    );
    expect(replacement.canStart()).toBe(true);
  });
});
