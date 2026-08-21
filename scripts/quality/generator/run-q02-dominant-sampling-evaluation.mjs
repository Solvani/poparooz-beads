import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "vite";

const outputDirectory = await mkdtemp(
  join(tmpdir(), "poparooz-q02-dominant-sampling-"),
);

try {
  await build({
    configFile: false,
    logLevel: "warn",
    ssr: { noExternal: true },
    build: {
      emptyOutDir: true,
      outDir: outputDirectory,
      ssr: resolve(
        "scripts/quality/generator/run-q02-dominant-sampling-evaluation.ts",
      ),
      rollupOptions: {
        output: { entryFileNames: "q02-dominant-sampling.mjs" },
      },
    },
  });
  await import(
    pathToFileURL(join(outputDirectory, "q02-dominant-sampling.mjs")).href
  );
} finally {
  await rm(outputDirectory, { force: true, recursive: true });
}
