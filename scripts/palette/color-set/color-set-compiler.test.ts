// @vitest-environment node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  COLOR_SET_CANONICAL_MEMBERSHIPS_SHA256,
  COLOR_SET_PUBLISHED_DEFINITIONS_SHA256,
  COLOR_SET_SOURCE_SHA256,
  PUBLISHED_PROFILE_MEMBERSHIP_SHA256,
} from "./color-set-compiler.ts";
import { compileColorSetProfilesFromFiles } from "./color-set-io.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("fixed Color Set compiler", () => {
  it("recompiles the approved workbook and every frozen identity", async () => {
    const result = await compileColorSetProfilesFromFiles(repositoryRoot);
    expect(result).toMatchObject({
      sourceSha256: COLOR_SET_SOURCE_SHA256,
      canonicalMembershipsSha256: COLOR_SET_CANONICAL_MEMBERSHIPS_SHA256,
      publishedProfileDefinitionsSha256: COLOR_SET_PUBLISHED_DEFINITIONS_SHA256,
      groupCounts: [24, 24, 24, 24, 24, 24, 24, 24, 29],
      totalCount: 221,
      uniqueCount: 221,
      duplicateCount: 0,
      unknownCodeCount: 0,
      hexMismatchCount: 0,
      missingOfficialCodeCount: 0,
    });
    expect(result.profileMembershipSha256).toEqual(
      PUBLISHED_PROFILE_MEMBERSHIP_SHA256,
    );
    expect(
      result.artifact.profiles.map((profile) => [
        profile.profileId,
        profile.size,
      ]),
    ).toEqual([
      ["poparooz-set-24", 24],
      ["poparooz-set-48", 48],
      ["poparooz-set-72", 72],
      ["poparooz-set-120", 120],
      ["poparooz-set-168", 168],
      ["poparooz-set-221", 221],
    ]);
    expect(result.artifact.profiles.map((profile) => profile.size)).not.toEqual(
      expect.arrayContaining([96, 144, 192]),
    );
  });

  it("is byte-identical and publishes membership only in Runtime sortOrder", async () => {
    const first = await compileColorSetProfilesFromFiles(repositoryRoot);
    const second = await compileColorSetProfilesFromFiles(repositoryRoot);
    expect(second.bytes).toBe(first.bytes);
    expect(second.sha256).toBe(first.sha256);
    for (const collection of [
      ...first.artifact.groups,
      ...first.artifact.profiles,
    ]) {
      expect(collection.memberCodes).toEqual(
        [...collection.memberCodes].sort(
          (left, right) => codeOrder(left) - codeOrder(right),
        ),
      );
    }
    expect(first.bytes).not.toMatch(
      /#(?:[0-9A-F]{6})|"(?:hex|rgb|lab|supplier|inventory|pricing|shopify|source|hash|lock)"/i,
    );
  });
});

function codeOrder(code: string): number {
  const series = "ABCDEFGHM".indexOf(code[0] ?? "");
  return series * 100 + Number(code.slice(1));
}
