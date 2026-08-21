import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "vite";

const bundleDirectory = await mkdtemp(
  join(tmpdir(), "poparooz-e05-production-evidence-"),
);

try {
  await build({
    configFile: false,
    logLevel: "warn",
    ssr: { noExternal: true },
    build: {
      emptyOutDir: true,
      outDir: bundleDirectory,
      ssr: resolve("scripts/quality/generator/run-e05-production-evidence.ts"),
      rollupOptions: {
        output: { entryFileNames: "e05-production-evidence.mjs" },
      },
    },
  });
  await import(
    pathToFileURL(join(bundleDirectory, "e05-production-evidence.mjs")).href
  );
} finally {
  await rm(bundleDirectory, { force: true, recursive: true });
}
