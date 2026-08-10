import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatColorSetCliError } from "./color-set-errors.ts";
import {
  compileColorSetProfilesFromFiles,
  COLOR_SET_INPUT_PATHS,
  publishColorSetArtifact,
} from "./color-set-io.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

try {
  const compilation = await compileColorSetProfilesFromFiles(repositoryRoot);
  const publication = await publishColorSetArtifact(
    compilation,
    path.join(repositoryRoot, COLOR_SET_INPUT_PATHS.artifact),
  );
  console.log(
    JSON.stringify({
      colorSet: "poparooz-fixed-color-sets/1.0.0",
      groupCounts: compilation.groupCounts,
      profiles: compilation.artifact.profiles.map(({ profileId, size }) => ({
        profileId,
        size,
      })),
      sha256: compilation.sha256,
      byteLength: Buffer.byteLength(compilation.bytes),
      published: publication.published,
    }),
  );
} catch (error) {
  console.error(formatColorSetCliError(error));
  process.exitCode = 1;
}
