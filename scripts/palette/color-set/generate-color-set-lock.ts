import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatColorSetCliError } from "./color-set-errors.ts";
import {
  COLOR_SET_LOCK_RELATIVE_PATH,
  compileColorSetLockFromFiles,
  publishColorSetLock,
} from "./color-set-lock.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
try {
  const compilation = await compileColorSetLockFromFiles(repositoryRoot);
  const publication = await publishColorSetLock(
    compilation,
    path.join(repositoryRoot, COLOR_SET_LOCK_RELATIVE_PATH),
  );
  console.log(
    JSON.stringify({
      lock: "poparooz-fixed-color-sets/1.0.0",
      sha256: compilation.sha256,
      byteLength: Buffer.byteLength(compilation.bytes),
      published: publication.published,
    }),
  );
} catch (error) {
  console.error(formatColorSetCliError(error));
  process.exitCode = 1;
}
