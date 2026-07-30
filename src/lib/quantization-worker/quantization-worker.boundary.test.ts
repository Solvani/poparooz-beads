import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const clientSource = readFileSync(
  resolve(
    process.cwd(),
    "src/lib/quantization-worker/quantization-worker.client.ts",
  ),
  "utf8",
);

describe("quantization worker main-thread boundary", () => {
  it.each([
    ["quantizer", "quantizeImage"],
    ["histogram", "color-histogram"],
    ["median cut", "median-cut"],
    ["medoid clusters", "cluster-representative"],
    ["palette", "/palette/"],
    ["Canvas", "Canvas"],
    ["network fetch", "fetch("],
    ["XHR", "XMLHttpRequest"],
    ["WebSocket", "WebSocket"],
    ["persistent storage", "localStorage"],
  ])("does not import or execute %s", (_label, forbidden) => {
    expect(clientSource).not.toContain(forbidden);
  });
});
