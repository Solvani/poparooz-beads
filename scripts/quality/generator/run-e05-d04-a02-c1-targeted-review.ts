import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderBlindReviewHtml } from "./generator-quality-d04-review-tool.ts";
import { serializeCanonicalJson } from "./generator-quality-scorecard.ts";

const EXPECTED_PRIVATE_ANALYSIS_SHA =
  "5fc1e0d13f84712d3cc3b170ee3444066873e85da698cb5cf9d5d13b5a8e494e";
const EXPECTED_REVEAL_KEY_SHA =
  "92596bff8f2219098bad50268263b2dea935b71b4af3131a3239ed6a1b28494e";
const EXPECTED_SOURCE_PACKET_SET_SHA =
  "1feeedeb9b04cd407526f40dd25c04a351c1389a20df6538eb8789b4027f15d7";
const TARGET_PACKET_SET_ID = "poparooz-e05-d04-a02-c1-targeted-review-1.0.0";
const repositoryRoot = process.cwd();
const sourceDirectory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-a02/1.0.0",
);
const sourcePrivateDirectory = path.join(
  repositoryRoot,
  ".quality-output/e05-d04-a02/private",
);
const targetPrivateDirectory = path.join(
  repositoryRoot,
  ".quality-output/e05-d04-a02-c1/private",
);
const operation = process.argv[2];
if (operation !== "--write" && operation !== "--verify") {
  throw new Error("Expected --write or --verify.");
}

const privateAnalysisPath = path.join(
  sourcePrivateDirectory,
  "e05-d04-a02-private-reveal-analysis.json",
);
const revealKeyPath = path.join(
  sourcePrivateDirectory,
  "e05-d04-a02-review-reveal-key.json",
);
const privateAnalysisBytes = await readFile(privateAnalysisPath);
const revealKeyBytes = await readFile(revealKeyPath);
if (
  sha256(privateAnalysisBytes) !== EXPECTED_PRIVATE_ANALYSIS_SHA ||
  sha256(revealKeyBytes) !== EXPECTED_REVEAL_KEY_SHA
) {
  throw new Error("A02 private ambiguity/reveal identity differs.");
}
const privateAnalysis = JSON.parse(
  privateAnalysisBytes.toString("utf8"),
) as PrivateAnalysis;
const sourceRevealKey = JSON.parse(
  revealKeyBytes.toString("utf8"),
) as SourceRevealKey;
const targetIds = new Set(privateAnalysis.ambiguousPacketIds);
const targetRecords = privateAnalysis.records.filter((record) =>
  targetIds.has(record.packetId),
);
const statusCounts = countBy(targetRecords, (record) => record.consensusStatus);
if (
  targetIds.size !== 35 ||
  targetRecords.length !== 35 ||
  statusCounts.direct_opposite_disagreement !== 12 ||
  statusCounts.direction_neutral_disagreement !== 15 ||
  statusCounts.cannot_judge_uncertain !== 8
) {
  throw new Error("A02 ambiguous packet identity differs.");
}

const sourceHtml = await readFile(
  path.join(sourceDirectory, "poparooz-d04-a02-blind-review.html"),
  "utf8",
);
const sourceTool = extractSourceTool(sourceHtml);
const sourceManifest = JSON.parse(
  await readFile(
    path.join(sourceDirectory, "e05-d04-a02-review-packet-manifest.json"),
    "utf8",
  ),
) as SourcePacketManifest;
if (
  sourceTool.packetSetSha256 !== EXPECTED_SOURCE_PACKET_SET_SHA ||
  sourceManifest.packetSetSha256 !== EXPECTED_SOURCE_PACKET_SET_SHA ||
  sourceTool.packets.length !== 60
) {
  throw new Error("A02 anonymous source packet identity differs.");
}
const manifestByPacket = new Map(
  sourceManifest.packets.map((packet) => [packet.packetId, packet]),
);
const selectedPackets = sourceTool.packets.filter((packet) =>
  targetIds.has(packet.packetId),
);
if (
  selectedPackets.length !== 35 ||
  selectedPackets.some((packet) => !validateImageIdentity(packet))
) {
  throw new Error("Targeted packet image identity differs.");
}
const selectedIds = new Set(selectedPackets.map((packet) => packet.packetId));
if ([...targetIds].some((packetId) => !selectedIds.has(packetId))) {
  throw new Error("Targeted packet set is incomplete.");
}

const targetPacketBase = Object.freeze({
  schemaVersion: "1.0.0",
  stage: "P3-A03-E05-D04-A02-C1",
  packetSetId: TARGET_PACKET_SET_ID,
  sourcePacketSetSha256: EXPECTED_SOURCE_PACKET_SET_SHA,
  comparisonCount: selectedPackets.length,
  requiredReviewerId: "reviewer-3",
  packets: Object.freeze(
    selectedPackets.map((packet) => {
      const manifest = manifestByPacket.get(packet.packetId)!;
      return Object.freeze({
        packetId: packet.packetId,
        leftImageSha256: manifest.leftImageSha256,
        rightImageSha256: manifest.rightImageSha256,
      });
    }),
  ),
});
const targetPacketSetSha256 = sha256(serializeCanonicalJson(targetPacketBase));
const targetManifest = Object.freeze({
  ...targetPacketBase,
  packetSetSha256: targetPacketSetSha256,
});
const html = renderBlindReviewHtml({
  packetSetId: TARGET_PACKET_SET_ID,
  packetSetSha256: targetPacketSetSha256,
  packets: selectedPackets,
  exactPacketCount: 35,
  resultStage: "P3-A03-E05-D04-A02-C",
  requiredReviewerId: "reviewer-3",
  explicitPatternChoiceLabels: true,
  storageNamespace: "poparooz-d04-a02-c1",
  downloadPrefix: "poparooz-a02-c1",
});
if (
  !html.includes("Pattern A clearly better") ||
  !html.includes("Pattern B slightly better") ||
  !html.includes('value="reviewer-3" readonly') ||
  html.includes("logicalCaseId") ||
  html.includes("leftProfileSize") ||
  html.includes("rightProfileSize")
) {
  throw new Error("Targeted reviewer HTML anonymity/copy gate failed.");
}
const revealByPacket = new Map(
  sourceRevealKey.packets.map((packet) => [packet.packetId, packet]),
);
const targetedReveal = Object.freeze({
  warning:
    "Local private reveal metadata. Never commit, upload, or show to Reviewer 3.",
  stage: "P3-A03-E05-D04-A02-C1",
  packetSetId: TARGET_PACKET_SET_ID,
  packetSetSha256: targetPacketSetSha256,
  sourceRevealKeySha256: EXPECTED_REVEAL_KEY_SHA,
  packets: Object.freeze(
    selectedPackets.map((packet) => {
      const reveal = revealByPacket.get(packet.packetId);
      if (reveal === undefined) throw new Error("Targeted reveal row missing.");
      return reveal;
    }),
  ),
});
const preparationAudit = Object.freeze({
  schemaVersion: "1.0.0",
  stage: "P3-A03-E05-D04-A02-C1",
  scope: "Local private targeted-review preparation; excluded from Git",
  sourcePrivateAnalysisSha256: EXPECTED_PRIVATE_ANALYSIS_SHA,
  sourceRevealKeySha256: EXPECTED_REVEAL_KEY_SHA,
  sourcePacketSetSha256: EXPECTED_SOURCE_PACKET_SET_SHA,
  targetPacketSetSha256,
  targetedComparisonCount: selectedPackets.length,
  ambiguityCounts: statusCounts,
  originalPairOrderPreserved: true,
  originalImageBytesPreserved: true,
  reviewerId: "reviewer-3",
  resultStage: "P3-A03-E05-D04-A02-C",
  reviewHtmlSha256: sha256(html),
});
const outputs = new Map<string, string>([
  [
    "e05-d04-a02-c1-targeted-packet-manifest.json",
    serializeCanonicalJson(targetManifest),
  ],
  [
    "e05-d04-a02-c1-targeted-reveal-key.json",
    serializeCanonicalJson(targetedReveal),
  ],
  [
    "e05-d04-a02-c1-preparation-audit.json",
    serializeCanonicalJson(preparationAudit),
  ],
  ["poparooz-a02-c1-reviewer-3.html", html],
]);
await mkdir(targetPrivateDirectory, { recursive: true });
for (const [fileName, content] of outputs) {
  const filePath = path.join(targetPrivateDirectory, fileName);
  if (operation === "--write") await writeFile(filePath, content, "utf8");
  else {
    const existing = await readFile(filePath, "utf8");
    if (existing !== content) {
      throw new Error(`${fileName} is not deterministic.`);
    }
  }
}
process.stdout.write(
  [
    `Targeted comparisons: ${selectedPackets.length}`,
    `Direct opposite: ${statusCounts.direct_opposite_disagreement}`,
    `Direction/neutral: ${statusCounts.direction_neutral_disagreement}`,
    `Cannot judge: ${statusCounts.cannot_judge_uncertain}`,
    `Target packet SHA-256: ${targetPacketSetSha256}`,
    `Review HTML SHA-256: ${preparationAudit.reviewHtmlSha256}`,
  ].join("\n") + "\n",
);

interface PrivateAnalysis {
  readonly ambiguousPacketIds: readonly string[];
  readonly records: readonly {
    readonly packetId: string;
    readonly consensusStatus: string;
  }[];
}

interface AnonymousPacket {
  readonly packetId: string;
  readonly leftImageDataUrl: string;
  readonly rightImageDataUrl: string;
}

interface SourceTool {
  readonly packetSetSha256: string;
  readonly packets: readonly AnonymousPacket[];
}

interface SourcePacketManifest {
  readonly packetSetSha256: string;
  readonly packets: readonly {
    readonly packetId: string;
    readonly leftImageSha256: string;
    readonly rightImageSha256: string;
  }[];
}

interface SourceRevealKey {
  readonly packets: readonly Readonly<
    Record<string, unknown> & {
      packetId: string;
    }
  >[];
}

function extractSourceTool(html: string): SourceTool {
  const match = html.match(/const tool=(.*);\nconst choices=/u);
  if (match?.[1] === undefined) {
    throw new Error("Anonymous source review payload is missing.");
  }
  return JSON.parse(match[1]) as SourceTool;
}

function validateImageIdentity(packet: AnonymousPacket): boolean {
  const manifest = manifestByPacket.get(packet.packetId);
  if (manifest === undefined) return false;
  return (
    sha256(imageBytes(packet.leftImageDataUrl)) === manifest.leftImageSha256 &&
    sha256(imageBytes(packet.rightImageDataUrl)) === manifest.rightImageSha256
  );
}

function imageBytes(dataUrl: string): Buffer {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix))
    throw new Error("Packet image is not PNG data.");
  return Buffer.from(dataUrl.slice(prefix.length), "base64");
}

function countBy<Value>(
  values: readonly Value[],
  key: (value: Value) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const item = key(value);
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
