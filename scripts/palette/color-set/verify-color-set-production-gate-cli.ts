import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatColorSetCliError } from "./color-set-errors.ts";
import { verifyColorSetProductionGate } from "./verify-color-set-production-gate.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
try {
  const result = await verifyColorSetProductionGate(repositoryRoot);
  console.log(
    [
      `${result.colorSetId} ${result.colorSetVersion}`,
      `Lock SHA-256: ${result.lockSha256}`,
      `Artifact SHA-256: ${result.artifactSha256}`,
      `Groups: ${result.groupCounts.join(" / ")}`,
      `Profiles: ${result.profileCounts.join(" / ")}`,
      "verified",
    ].join("\n"),
  );
} catch (error) {
  console.error(formatColorSetCliError(error));
  process.exitCode = 1;
}
