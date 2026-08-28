import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { EmailGateCapability } from "../email-gate/email-gate-capability";
import type { GenerationRuntime } from "../features/generator/generation.types";
import { createPublicPattern } from "../features/pattern-canvas/test/pattern-result";
import { App } from "./App";

vi.mock("../email-gate/EmailGateDialog", () => {
  throw new Error("simulated Gate presentation load failure");
});

const COLOR_SET_PROFILES = [
  { profileId: "poparooz-set-24", size: 24 },
  { profileId: "poparooz-set-48", size: 48 },
  { profileId: "poparooz-set-72", size: 72 },
  { profileId: "poparooz-set-120", size: 120 },
  { profileId: "poparooz-set-168", size: 168 },
  { profileId: "poparooz-set-221", size: 221 },
] as const;

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:app-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    createImageData: vi.fn((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb",
    })),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 600,
    bottom: 420,
    width: 600,
    height: 420,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("fails closed when the lazy Gate presentation cannot load", async () => {
  const writeUnlocked = vi.fn(() => true);
  const gate: Extract<
    EmailGateCapability,
    { availability: { available: true } }
  > = {
    availability: { available: true },
    client: {
      issueChallenge: vi.fn(),
      verifyChallenge: vi.fn(),
    },
    issueProofProvider: { getFreshIssueToken: vi.fn() },
    unlockStore: {
      isUnlocked: vi.fn(() => false),
      writeUnlocked,
    },
  };
  const runtime: Extract<
    GenerationRuntime,
    { availability: { available: true } }
  > = {
    availability: { available: true },
    service: { generate: vi.fn(async () => createPublicPattern()) },
    colorSetProfiles: COLOR_SET_PROFILES,
  };
  const anchorClick = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});

  render(<App generationRuntime={runtime} emailGateCapability={gate} />);
  await userEvent.upload(
    screen.getByLabelText("Choose Image"),
    new File(["image"], "photo.png", { type: "image/png" }),
  );
  await userEvent.clear(screen.getByLabelText("Maximum Colors"));
  await userEvent.type(screen.getByLabelText("Maximum Colors"), "16");
  await userEvent.click(screen.getByRole("radio", { name: /Full Background/ }));
  await userEvent.click(
    await screen.findByRole("button", { name: "Generate Pattern" }),
  );
  await screen.findByRole("heading", { name: "Pattern Summary" });
  await userEvent.click(
    screen.getByRole("button", { name: "Save / Download Pattern" }),
  );

  expect(
    await screen.findByRole("alertdialog", {
      name: "Download unlock unavailable",
    }),
  ).toBeInTheDocument();
  expect(writeUnlocked).not.toHaveBeenCalled();
  expect(anchorClick).not.toHaveBeenCalled();
  expect(gate.client.issueChallenge).not.toHaveBeenCalled();
});
