import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
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
});
