import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  GenerationInputSnapshot,
  GenerationRuntime,
  GenerationService,
} from "../../features/generator/generation.types";
import {
  ControlledGenerationOperatorRuntime,
  PATTERN_COSTING_SEMANTIC_AUTHORITY,
} from "../../features/pattern-costing";
import {
  ASSERTION_ID,
  MANIFEST,
  RUNTIME_AUTHORITY,
  allA1Pattern,
  manifestBytes,
} from "../../features/pattern-costing/test-fixtures";
import { ControlledGenerationOperator } from "./ControlledGenerationOperator";

function manifestFile(
  assertionId = ASSERTION_ID,
  generationAttemptId = MANIFEST.entries[0]!.generationAttemptId,
): File {
  const bytes = manifestBytes({
    ...MANIFEST,
    expectedGeneratorImplementationAuthorityId:
      PATTERN_COSTING_SEMANTIC_AUTHORITY,
    entries: [
      {
        ...MANIFEST.entries[0]!,
        assertionId,
        generationAttemptId,
      },
    ],
  });
  const serialized = new TextDecoder().decode(bytes);
  const file = new File([serialized], "controlled-generation-manifest.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () =>
      new TextEncoder().encode(serialized).buffer as ArrayBuffer,
  });
  return file;
}

function generationRuntime(
  generate: GenerationService["generate"],
): GenerationRuntime {
  return {
    availability: { available: true },
    service: { generate },
    colorSetProfiles: [{ profileId: "poparooz-set-221", size: 221 }],
    patternCostingRuntimeAuthorities: [RUNTIME_AUTHORITY],
  };
}

describe("ControlledGenerationOperator", () => {
  it("is an actual controlled caller and blocks the same authority after remount", async () => {
    const user = userEvent.setup();
    const generate = vi.fn(
      async (input: GenerationInputSnapshot, signal: AbortSignal) => {
        void input;
        void signal;
        return allA1Pattern();
      },
    );
    const operatorRuntime = new ControlledGenerationOperatorRuntime();
    const runtime = generationRuntime(generate);
    const first = render(
      <ControlledGenerationOperator
        operatorRuntime={operatorRuntime}
        generationRuntime={runtime}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Controlled generation manifest/), {
      target: { files: [manifestFile()] },
    });
    await user.type(screen.getByLabelText("Assertion ID"), ASSERTION_ID);
    await user.click(
      screen.getByRole("button", { name: "Bind manifest assertion" }),
    );
    await screen.findByText("Authority bound. This attempt is ready.");

    fireEvent.change(screen.getByLabelText(/Source image/), {
      target: {
        files: [new File(["image"], "source.png", { type: "image/png" })],
      },
    });
    const generateButton = screen.getByRole("button", {
      name: "Generate controlled pattern",
    });
    await waitFor(() => expect(generateButton).toBeEnabled());
    await user.click(generateButton);
    await waitFor(() => expect(generate).toHaveBeenCalledOnce());
    await screen.findByRole("heading", { name: "PatternCosting artifact" });
    expect(screen.getByText(/Attempt: consumed/)).toBeInTheDocument();

    first.unmount();
    render(
      <ControlledGenerationOperator
        operatorRuntime={operatorRuntime}
        generationRuntime={runtime}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Controlled generation manifest/), {
      target: { files: [manifestFile()] },
    });
    await user.type(screen.getByLabelText("Assertion ID"), ASSERTION_ID);
    await user.click(
      screen.getByRole("button", { name: "Bind manifest assertion" }),
    );
    await screen.findByText(
      "Authority bound, but this attempt was already consumed in this runtime.",
    );
    expect(
      screen.getByRole("button", { name: "Generate controlled pattern" }),
    ).toBeDisabled();
    expect(generate).toHaveBeenCalledOnce();

    const nextAssertionId = "018f3b71-6f14-7d42-9e8a-3b2e179a8d11";
    const nextAttemptId = "018f3b71-6f14-7d42-9e8a-3b2e179a8d12";
    fireEvent.change(screen.getByLabelText(/Controlled generation manifest/), {
      target: { files: [manifestFile(nextAssertionId, nextAttemptId)] },
    });
    await user.clear(screen.getByLabelText("Assertion ID"));
    await user.type(screen.getByLabelText("Assertion ID"), nextAssertionId);
    await user.click(
      screen.getByRole("button", { name: "Bind manifest assertion" }),
    );
    await screen.findByText("Authority bound. This attempt is ready.");
    fireEvent.change(screen.getByLabelText(/Source image/), {
      target: {
        files: [new File(["image"], "next.png", { type: "image/png" })],
      },
    });
    const nextGenerate = screen.getByRole("button", {
      name: "Generate controlled pattern",
    });
    await waitFor(() => expect(nextGenerate).toBeEnabled());
    await user.click(nextGenerate);
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
  });
});
