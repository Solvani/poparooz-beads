import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const { FORMAL_PALETTE_SOURCE_FILE_NAME } =
  await import("./formal-palette-xlsx-compiler.ts");
const { formatFormalPaletteCliError } =
  await import("./formal-palette-errors.ts");
const { publishFormalPaletteCompilation } =
  await import("./formal-palette-publication.ts");

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const incomingSourcePath = path.join(
  repositoryRoot,
  "data-source",
  "incoming",
  FORMAL_PALETTE_SOURCE_FILE_NAME,
);
const outputDirectory = path.join(
  repositoryRoot,
  "data-source",
  "palettes",
  "poparooz-standard",
  "1.0.0",
);
try {
  const compilation = await publishFormalPaletteCompilation(
    incomingSourcePath,
    outputDirectory,
  );
  console.log(
    JSON.stringify(
      {
        paletteId: compilation.normalizedPalette.manifest.paletteId,
        paletteVersion: compilation.normalizedPalette.manifest.paletteVersion,
        recordCount: compilation.normalizedPalette.colors.length,
        paletteCanonicalSha256:
          compilation.normalizedPalette.manifest.canonicalRecordsSha256,
        derivationAuditSha256:
          compilation.paletteValidationReport.derivationAuditSha256,
        substituteDatasetId:
          compilation.normalizedSubstitutes.substituteDatasetId,
        relationCount: compilation.normalizedSubstitutes.relations.length,
        substituteCanonicalSha256:
          compilation.normalizedSubstitutes.canonicalRecordsSha256,
        incomingRetained: compilation.incomingRetained,
        incomingMatchesFormalSource:
          compilation.incomingMatchesFormalSource ?? false,
        outputDirectory: path.relative(repositoryRoot, outputDirectory),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(formatFormalPaletteCliError(error));
  process.exitCode = 1;
}
