import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GeneratorState } from "./generator-state";
import { GenerationStatus } from "./GenerationStatus";

afterEach(cleanup);

function renderStatus(
  state: GeneratorState,
  overrides: Partial<Parameters<typeof GenerationStatus>[0]> = {},
) {
  const props = {
    state,
    availability: { available: true } as const,
    canGenerate: true,
    canRegenerate: true,
    onGenerate: vi.fn(),
    onAbort: vi.fn(),
    ...overrides,
  };
  return { ...render(<GenerationStatus {...props} />), props };
}

const INPUT = { imageVersion: 1, candidate: null };

describe("GenerationStatus", () => {
  it("keeps generation disabled with a safe explanation when runtime data is unavailable", () => {
    renderStatus(
      { status: "image-loaded", input: INPUT },
      {
        availability: { available: false, reason: "palette-unavailable" },
        canGenerate: false,
      },
    );
    expect(
      screen.getByRole("button", { name: "Generate Pattern" }),
    ).toHaveClass("generation-status__action");
    expect(
      screen.getByRole("button", { name: "Generate Pattern" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Pattern generation is not available in this preview."),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("palette");
  });

  it("shows abort for processing and regeneration", async () => {
    const processing = renderStatus({
      status: "processing",
      input: INPUT,
      job: {} as never,
    });
    await userEvent.click(screen.getByRole("button", { name: "Abort" }));
    expect(processing.props.onAbort).toHaveBeenCalledOnce();
    processing.unmount();

    renderStatus({
      status: "regenerating",
      input: INPUT,
      job: {} as never,
      lastSuccess: {} as never,
    });
    expect(screen.getByText("Updating your pattern…")).toBeInTheDocument();
    expect(
      screen.getByText("Your previous pattern is still available."),
    ).toBeInTheDocument();
  });

  it("shows dirty, aborted, error, and success states without result details", () => {
    const views: GeneratorState[] = [
      { status: "dirty", input: INPUT, lastSuccess: {} as never },
      { status: "aborted", input: INPUT },
      {
        status: "error",
        input: INPUT,
        error: { code: "unknown", message: "Safe customer message" },
      },
      { status: "success", input: INPUT, lastSuccess: {} as never },
    ];

    const dirty = renderStatus(views[0]!);
    expect(screen.getByText("Settings changed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Regenerate Pattern" }),
    ).toBeEnabled();
    dirty.unmount();
    const aborted = renderStatus(views[1]!);
    expect(screen.getByText("Pattern generation stopped.")).toBeInTheDocument();
    aborted.unmount();
    const error = renderStatus(views[2]!);
    expect(screen.getByText("Safe customer message")).toBeInTheDocument();
    error.unmount();
    renderStatus(views[3]!);
    expect(screen.getByText("Pattern data is ready.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("beads");
    expect(document.body.querySelector("canvas")).toBeNull();
  });
});
