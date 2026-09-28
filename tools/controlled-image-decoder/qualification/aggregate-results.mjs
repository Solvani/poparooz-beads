import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const inputDirectory = resolve(process.argv[2] ?? resolve(here, "ci-results"));
const files = (await readdir(inputDirectory))
  .filter((file) => file.endsWith(".json") && file !== "aggregate.json")
  .sort();
const results = await Promise.all(
  files.map(async (file) => ({
    file,
    value: JSON.parse(await readFile(resolve(inputDirectory, file), "utf8")),
  })),
);

const native = results.find(({ value }) => value.runner === "node-native-wasm");
const browsers = results.filter(
  ({ value }) => value.runner === "browser-worker",
);
if (!native) throw new Error("Missing Linux native WASM result");
for (const browserName of [
  "chromium-windows",
  "chromium-linux",
  "firefox-linux",
]) {
  if (!browsers.some(({ value }) => value.environmentId === browserName)) {
    throw new Error(`Missing ${browserName} result`);
  }
}
if (results.some(({ value }) => value.failures !== 0)) {
  throw new Error("At least one qualification runner reported failures");
}

const wasmDigests = new Set(results.map(({ value }) => value.wasmSha256));
if (wasmDigests.size !== 1)
  throw new Error("Qualification runners used different WASM digests");
const fixtureCounts = new Set(results.map(({ value }) => value.fixtureCount));
if (fixtureCounts.size !== 1)
  throw new Error("Qualification runners used different fixture counts");

const fixtureCases = native.value.cases.filter((entry) => entry.sourceSha256);
const equalityFields = [
  "disposition",
  "actualCodec",
  "encodedWidth",
  "encodedHeight",
  "decodedWidth",
  "decodedHeight",
  "orientationObserved",
  "orientationState",
  "iccState",
  "pixelFormat",
  "rgbaByteLength",
  "decodedPixelSha256",
  "decoderImplementationId",
  "decoderImplementationVersion",
  "runtimeAbiVersion",
];
for (const browser of browsers) {
  for (const expected of fixtureCases) {
    const actual = browser.value.cases.find(
      (entry) => entry.fixtureId === expected.fixtureId,
    );
    if (!actual)
      throw new Error(
        `${browser.value.environmentId}: missing ${expected.fixtureId}`,
      );
    if (actual.sourceSha256 !== expected.sourceSha256) {
      throw new Error(
        `${browser.value.environmentId}: source digest mismatch for ${expected.fixtureId}`,
      );
    }
    for (const field of equalityFields) {
      if (actual.actual[field] !== expected.actual[field]) {
        throw new Error(
          `${browser.value.environmentId}: ${expected.fixtureId} ${field} mismatch (${actual.actual[field]} != ${expected.actual[field]})`,
        );
      }
    }
  }
}

const aggregate = {
  schema: "PoparoozControlledDecoderQualificationAggregate/1.0.0",
  status: "PASS",
  wasmSha256: [...wasmDigests][0],
  fixtureCount: [...fixtureCounts][0],
  environments: results.map(({ file, value }) => ({
    file,
    environmentId: value.environmentId ?? value.platform,
    runner: value.runner,
    browserVersion: value.browserVersion ?? null,
    nodeVersion: value.nodeVersion ?? null,
    failures: value.failures,
  })),
  equalityFields,
  crossPlatformByteEquality: "PASS",
};
const outputPath = resolve(
  process.env.QUALIFICATION_AGGREGATE ??
    resolve(inputDirectory, "aggregate.json"),
);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(aggregate, null, 2)}\n`);
console.log(
  JSON.stringify(
    { outputPath, status: aggregate.status, wasmSha256: aggregate.wasmSha256 },
    null,
    2,
  ),
);
