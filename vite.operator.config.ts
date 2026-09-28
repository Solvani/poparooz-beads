import { fileURLToPath, URL } from "node:url";
import { defineConfig, type ConfigEnv, type UserConfig } from "vite";

import { createViteConfig } from "./vite.config";

export async function createOperatorViteConfig(
  environment: ConfigEnv,
): Promise<UserConfig> {
  const base = await createViteConfig(environment);
  const controlledOperatorHeaders = {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  };
  return {
    ...base,
    publicDir: false,
    server: {
      open: "/operator/controlled-generation/index.html",
      headers: controlledOperatorHeaders,
    },
    preview: {
      headers: controlledOperatorHeaders,
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
          controlledDecoderQualification: fileURLToPath(
            new URL(
              "./operator/controlled-generation/decoder-qualification.html",
              import.meta.url,
            ),
          ),
        },
      },
    },
  };
}

export default defineConfig(createOperatorViteConfig);
