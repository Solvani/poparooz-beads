import { fileURLToPath, URL } from "node:url";
import { defineConfig, type ConfigEnv, type UserConfig } from "vite";

import { createViteConfig } from "./vite.config";

export async function createOperatorViteConfig(
  environment: ConfigEnv,
): Promise<UserConfig> {
  const base = await createViteConfig(environment);
  return {
    ...base,
    publicDir: false,
    server: {
      open: "/operator/controlled-generation/index.html",
    },
    build: {
      ...base.build,
      outDir: "dist-operator",
      rollupOptions: {
        preserveEntrySignatures: "strict" as const,
        input: {
          controlledGenerationOperator: fileURLToPath(
            new URL(
              "./operator/controlled-generation/index.html",
              import.meta.url,
            ),
          ),
        },
      },
    },
  };
}

export default defineConfig(createOperatorViteConfig);
