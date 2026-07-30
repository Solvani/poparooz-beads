import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "vite";

const outputDirectory = await mkdtemp(join(tmpdir(), "poparooz-benchmark-"));

try {
  await build({
    configFile: false,
    logLevel: "warn",
    ssr: { noExternal: true },
    build: {
      emptyOutDir: true,
      outDir: outputDirectory,
      ssr: resolve("scripts/benchmarks/benchmark-report.ts"),
      rollupOptions: {
        output: { entryFileNames: "benchmark.mjs" },
      },
    },
  });
  await import(pathToFileURL(join(outputDirectory, "benchmark.mjs")).href);
} finally {
  await rm(outputDirectory, { force: true, recursive: true });
}
