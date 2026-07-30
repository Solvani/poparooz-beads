/**
 * P2-I09 browser-validation entry point.
 *
 * This file is intentionally outside src/, is not imported by the production
 * entry point, and supplies only clearly labelled Poparooz validation data.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "../../src/app/App";
import type { GenerationRuntime } from "../../src/features/generator/generation.types";
import { createResultFixture } from "../../src/features/results/test/result-fixture";
import "../../src/styles.css";

const parameters = new URLSearchParams(window.location.search);
const firstDelay = readDelay("firstDelay", 120);
const regenerationDelay = readDelay("regenerationDelay", 4_000);
const scenario = parameters.get("scenario") ?? "success";
const validationResult = createValidationResult();
let requestCount = 0;

const runtime: GenerationRuntime = {
  availability: { available: true },
  service: {
    generate: (_input, signal) => {
      requestCount += 1;
      const isFirstRequest = requestCount === 1;
      const shouldFail =
        (scenario === "first-error" && isFirstRequest) ||
        (scenario === "regeneration-error" && !isFirstRequest);
      const delay = isFirstRequest ? firstDelay : regenerationDelay;
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          if (shouldFail)
            reject(new Error("Pattern generation could not finish."));
          else resolve(validationResult);
        }, delay);
        signal.addEventListener(
          "abort",
          () => {
            window.clearTimeout(timer);
            reject(new DOMException("Stopped", "AbortError"));
          },
          { once: true },
        );
      });
    },
  },
};

function readDelay(name: string, fallback: number): number {
  const value = Number(parameters.get(name));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function createValidationResult() {
  const size = readInteger("size", 40, 1, 1024);
  const colorCount = readInteger("colors", 2, 1, 512);
  const boardColumns = readInteger("boardColumns", size === 40 ? 2 : 16, 1, 64);
  const boardRows = readInteger("boardRows", size === 40 ? 2 : 16, 1, 64);
  const total = size * size;
  const baseCount = Math.floor(total / colorCount);
  const remainder = total % colorCount;
  const colors = Array.from({ length: colorCount }, (_, index) => ({
    index,
    beadCount: baseCount + (index < remainder ? 1 : 0),
    code: `POP-TEST-${String(index + 1).padStart(3, "0")}`,
    name: `Validation Color ${index + 1}`,
  }));

  return createResultFixture({
    width: size,
    height: size,
    transparentPositions: 0,
    colors,
    boardColumns,
    boardRows,
  });
}

function readInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number(parameters.get(name));
  return Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
}

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Validation harness root is missing.");

createRoot(root).render(
  <StrictMode>
    <aside
      className="validation-harness-label"
      aria-label="Validation notice"
      data-browser-user-agent={navigator.userAgent}
      data-device-pixel-ratio={window.devicePixelRatio}
    >
      P2-I09 validation only — test pattern and colors
    </aside>
    <App generationRuntime={runtime} />
  </StrictMode>,
);
