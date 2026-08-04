import react from "@vitejs/plugin-react";
import { defineConfig, type ConfigEnv } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import type { UserConfig } from "vite";

import { verifyRuntimePaletteProductionGate } from "./scripts/palette/runtime/verify-runtime-palette-production-gate.ts";

export type RuntimePaletteGateVerifier = (
  repositoryRoot: string,
) => Promise<unknown>;

export async function createViteConfig(
  environment: ConfigEnv,
  verifyProductionGate: RuntimePaletteGateVerifier = verifyRuntimePaletteProductionGate,
  repositoryRoot = fileURLToPath(new URL(".", import.meta.url)),
): Promise<UserConfig> {
  if (environment.command === "build") {
    await verifyProductionGate(repositoryRoot);
  }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        preserveEntrySignatures: "strict",
        input: {
          app: fileURLToPath(new URL("./index.html", import.meta.url)),
          quantizationWorkerClient: fileURLToPath(
            new URL("./src/lib/quantization-worker/index.ts", import.meta.url),
          ),
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
}

export default defineConfig(createViteConfig);
