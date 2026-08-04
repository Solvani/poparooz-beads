import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatRuntimePaletteCliError } from "./runtime-palette-errors.ts";
import {
  compileRuntimePaletteLockFromFiles,
  publishRuntimePaletteLock,
  RUNTIME_PALETTE_LOCK_RELATIVE_PATH,
} from "./runtime-palette-lock.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const outputPath = path.join(
  repositoryRoot,
  RUNTIME_PALETTE_LOCK_RELATIVE_PATH,
);

try {
  const compilation = await compileRuntimePaletteLockFromFiles(repositoryRoot);
  const publication = await publishRuntimePaletteLock(compilation, outputPath);
  console.log(
    JSON.stringify({
      lock: "poparooz-standard/formal-1.0.0/runtime-1.0.0",
      sha256: compilation.sha256,
      published: publication.published,
    }),
  );
} catch (error) {
  console.error(formatRuntimePaletteCliError(error));
  process.exitCode = 1;
}
