import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "vite";

const outputDirectory = await mkdtemp(
  join(tmpdir(), "poparooz-h03-candidate-quality-"),
);

try {
  await build({
    configFile: false,
    logLevel: "warn",
    ssr: { noExternal: true },
    build: {
      emptyOutDir: true,
      outDir: outputDirectory,
      ssr: resolve("scripts/quality/generator/run-h03-candidate-evaluation.ts"),
      rollupOptions: {
        output: { entryFileNames: "h03-candidate-quality.mjs" },
      },
    },
  });
  await import(
    pathToFileURL(join(outputDirectory, "h03-candidate-quality.mjs")).href
  );
} finally {
  await rm(outputDirectory, { force: true, recursive: true });
}
