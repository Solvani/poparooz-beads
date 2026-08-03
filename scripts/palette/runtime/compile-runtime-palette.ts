import { fileURLToPath } from "node:url";
import path from "node:path";

import { formatRuntimePaletteCliError } from "./runtime-palette-errors.ts";
import {
  compileRuntimePaletteFromFiles,
  publishRuntimePaletteArtifact,
} from "./runtime-palette-io.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const formalDirectory = path.join(
  repositoryRoot,
  "data-source",
  "palettes",
  "poparooz-standard",
  "1.0.0",
);
const policyPath = path.join(
  repositoryRoot,
  "scripts",
  "palette",
  "runtime",
  "policies",
  "poparooz-standard.formal-1.0.0.runtime-1.0.0.json",
);
const outputPath = path.join(
  repositoryRoot,
  "src",
  "runtime",
  "palette",
  "artifacts",
  "poparooz-standard",
  "formal-1.0.0",
  "runtime-1.0.0",
  "runtime-palette.json",
);

try {
  const compilation = await compileRuntimePaletteFromFiles(
    formalDirectory,
    policyPath,
  );
  const publication = await publishRuntimePaletteArtifact(
    compilation,
    outputPath,
  );
  console.log(
    JSON.stringify({
      artifact: "poparooz-standard/formal-1.0.0/runtime-1.0.0",
      recordCount: compilation.artifact.recordCount,
      activeCount: compilation.artifact.activeCount,
      autoMatchEligibleCount: compilation.artifact.autoMatchEligibleCount,
      sha256: compilation.sha256,
      published: publication.published,
    }),
  );
} catch (error) {
  console.error(formatRuntimePaletteCliError(error));
  process.exitCode = 1;
}
