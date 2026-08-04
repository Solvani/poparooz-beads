import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { formatRuntimePaletteCliError } from "./runtime-palette-errors.ts";
import { verifyRuntimePaletteProductionGate } from "./verify-runtime-palette-production-gate.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

interface RuntimePaletteProductionGateCliOutput {
  log(message: string): void;
  error(message: string): void;
}

export async function runRuntimePaletteProductionGateCli(
  root = repositoryRoot,
  output: RuntimePaletteProductionGateCliOutput = console,
  verify = verifyRuntimePaletteProductionGate,
): Promise<0 | 1> {
  try {
    const result = await verify(root);
    output.log(
      [
        `${result.paletteId} formal-${result.paletteVersion} runtime-${result.artifactVersion}`,
        `Lock SHA-256: ${result.runtimeLockSha256}`,
        `Artifact SHA-256: ${result.runtimeArtifactSha256}`,
        `Counts: ${result.recordCount} / ${result.activeCount} / ${result.autoMatchEligibleCount}`,
        "verified",
      ].join("\n"),
    );
    return 0;
  } catch (error) {
    output.error(formatRuntimePaletteCliError(error));
    return 1;
  }
}

const invokedAsEntryPoint =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedAsEntryPoint) {
  process.exitCode = await runRuntimePaletteProductionGateCli();
}
