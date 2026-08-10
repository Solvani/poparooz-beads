import { builtinModules } from "node:module";

import { ColorSetArtifactSchema } from "./color-set.schema.ts";

export const APPROVED_COLOR_SET_ARTIFACT_MODULE =
  "/src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json";
const requiredModules = [
  "/src/runtime/color-set/approved-color-set.ts",
  "/src/runtime/color-set/color-set.provider.ts",
  "/src/runtime/color-set/color-set.schema.ts",
  APPROVED_COLOR_SET_ARTIFACT_MODULE,
  "/src/runtime/generation-color-set/color-set-to-generation.adapter.ts",
  "/src/runtime/generation-color-set/generation-color-set.schema.ts",
] as const;
const nodeBuiltins = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

export function verifyColorSetProductionBundleBoundary(input: {
  readonly moduleIds: readonly string[];
  readonly emittedFiles: readonly {
    readonly relativePath: string;
    readonly content: string;
  }[];
  readonly artifact: unknown;
}) {
  const moduleIds = input.moduleIds.map(
    (value) =>
      value.replace(/^\0/, "").replaceAll("\\", "/").split("?")[0] ?? value,
  );
  for (const required of requiredModules)
    if (!moduleIds.some((moduleId) => moduleId.endsWith(required)))
      fail(`Required Color Set browser module is missing: ${required}`);
  for (const moduleId of moduleIds) {
    if (
      moduleId.startsWith("node:") ||
      nodeBuiltins.has(moduleId) ||
      moduleId.includes("/node_modules/exceljs/") ||
      moduleId.includes("/scripts/palette/color-set/") ||
      moduleId.includes("/data-source/color-sets/") ||
      moduleId.includes(
        "/data-source/runtime-locks/poparooz-fixed-color-sets/",
      ) ||
      /(?:\.xlsx|color-set-profiles\.lock\.json)$/i.test(moduleId) ||
      /(?:shopify|inventory|pricing)/i.test(moduleId)
    )
      fail(`Forbidden Color Set browser module: ${moduleId}`);
  }
  const artifactModules = moduleIds.filter(
    (moduleId) =>
      moduleId.includes("/src/runtime/color-set/artifacts/") &&
      moduleId.endsWith(".json"),
  );
  if (
    artifactModules.length !== 1 ||
    !artifactModules[0]?.endsWith(APPROVED_COLOR_SET_ARTIFACT_MODULE)
  )
    fail(
      "Production graph must contain exactly the approved membership Artifact.",
    );
  const result = ColorSetArtifactSchema.safeParse(input.artifact);
  if (!result.success)
    fail("Browser Color Set Artifact failed strict validation.");
  assertExactKeys(result.data, [
    "schemaVersion",
    "artifactVersion",
    "colorSetId",
    "colorSetVersion",
    "groups",
    "profiles",
  ]);
  for (const group of result.data.groups)
    assertExactKeys(group, ["group", "memberCodes"]);
  for (const profile of result.data.profiles)
    assertExactKeys(profile, ["profileId", "size", "groups", "memberCodes"]);
  const forbiddenContent =
    /(?:Poparooz色卡-套装明细|sourceWorkbookSha256|canonicalMembershipsSha256|publishedProfileDefinitionsSha256|color-set-profiles\.lock|data-source[\\/]color-sets|exceljs|shopify|inventory|pricing)/i;
  for (const file of input.emittedFiles)
    if (
      forbiddenContent.test(file.content) ||
      /(?:\.xlsx|\.lock\.json)$/i.test(file.relativePath)
    )
      fail(`Forbidden Color Set emitted content: ${file.relativePath}`);
  return Object.freeze({
    requiredModuleCount: requiredModules.length,
    artifactModules: Object.freeze(artifactModules),
    groupCount: 9,
    profileCounts: Object.freeze(
      result.data.profiles.map((profile) => profile.size),
    ),
    verified: true as const,
  });
}

function assertExactKeys(value: object, expected: readonly string[]): void {
  if (JSON.stringify(Object.keys(value)) !== JSON.stringify(expected))
    fail("Color Set Artifact fields do not match the browser whitelist.");
}
function fail(message: string): never {
  throw new Error(`[COLOR_SET_BUNDLE_BOUNDARY] ${message}`);
}
