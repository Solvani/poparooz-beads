import { createHash } from "node:crypto";

import ExcelJS, { type Worksheet } from "exceljs";
import { format } from "prettier";

import { ColorSetCompilationError } from "./color-set-errors.ts";
import {
  ColorSetArtifactSchema,
  type ColorSetArtifact,
} from "./color-set.schema.ts";

export const COLOR_SET_SOURCE_SHA256 =
  "a32aac97868a8740c4e4d5bf981f434997708beea710a6493abaf15848179f0c";
export const COLOR_SET_CANONICAL_MEMBERSHIPS_SHA256 =
  "0010d6e5084074a62869ea44abc4da874131177ac4c7c52375ae60ccd87f1639";
export const COLOR_SET_PUBLISHED_DEFINITIONS_SHA256 =
  "2d5338fe221cf21de68175edf93ac8d2705969f4c4139ca370b5b6fd6937a18b";
export const FORMAL_PALETTE_CANONICAL_SHA256 =
  "1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4";

export const PUBLISHED_PROFILE_DEFINITIONS = [
  { profileId: "poparooz-set-24", size: 24, groups: [1] },
  { profileId: "poparooz-set-48", size: 48, groups: [1, 2] },
  { profileId: "poparooz-set-72", size: 72, groups: [1, 2, 3] },
  { profileId: "poparooz-set-120", size: 120, groups: [1, 2, 3, 4, 5] },
  { profileId: "poparooz-set-168", size: 168, groups: [1, 2, 3, 4, 5, 6, 7] },
  {
    profileId: "poparooz-set-221",
    size: 221,
    groups: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
] as const;

export const PUBLISHED_PROFILE_MEMBERSHIP_SHA256 = {
  "poparooz-set-24":
    "ac97b53db5b7b9baab9ad37a156557e8f7edd911c6e3fe938000b8495f7f59c5",
  "poparooz-set-48":
    "d5d082e467a9113a2a702d0b5d00fe1e248c7e016c1edb6f87323c9b381879c1",
  "poparooz-set-72":
    "e76f71ffa76069dee6742a761ab8f49450bcf3c7e60bb762c7f5b494861a63eb",
  "poparooz-set-120":
    "415f53de6840ee9e083da336199e944ac8c009e3aa44bb7370e8388f1f23deb5",
  "poparooz-set-168":
    "3137b4e30aed1132f8cbc0e06eb4d76a34f0a5da98dd806c56346493317275e7",
  "poparooz-set-221":
    "8097d031ba046eea3a3cc53ac373ce175a88a47060331ad0570835de14cb373f",
} as const;

interface FormalColor {
  readonly code: string;
  readonly hex: string;
  readonly canonicalSourceIndex: number;
}
interface RuntimeColor {
  readonly code: string;
  readonly sortOrder: number;
}

export interface ColorSetCompilerInput {
  readonly sourceBytes: Uint8Array;
  readonly normalizedPalette: unknown;
  readonly runtimePalette: unknown;
}

export interface ColorSetCompilation {
  readonly artifact: ColorSetArtifact;
  readonly bytes: string;
  readonly sha256: string;
  readonly sourceSha256: string;
  readonly canonicalMembershipsSha256: string;
  readonly publishedProfileDefinitionsSha256: string;
  readonly profileMembershipSha256: Readonly<Record<string, string>>;
  readonly groupCounts: readonly number[];
  readonly totalCount: 221;
  readonly uniqueCount: 221;
  readonly duplicateCount: 0;
  readonly unknownCodeCount: 0;
  readonly hexMismatchCount: 0;
  readonly missingOfficialCodeCount: 0;
}

export async function compileColorSetProfiles(
  input: ColorSetCompilerInput,
): Promise<ColorSetCompilation> {
  const sourceSha256 = hashBytes(input.sourceBytes);
  assert(
    sourceSha256 === COLOR_SET_SOURCE_SHA256,
    "Approved source workbook hash mismatch.",
  );
  const formalColors = parseFormalColors(input.normalizedPalette);
  const runtimeColors = parseRuntimeColors(input.runtimePalette);
  const formalByCode = new Map(
    formalColors.map((color) => [color.code, color]),
  );
  const runtimeOrder = new Map(
    runtimeColors.map((color) => [color.code, color.sortOrder]),
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    Buffer.from(input.sourceBytes) as unknown as Parameters<
      typeof workbook.xlsx.load
    >[0],
  );
  assert(
    JSON.stringify(workbook.worksheets.map((sheet) => sheet.name)) ===
      JSON.stringify(["221色卡", "替代色参考", "套装明细"]),
    "Workbook worksheet inventory mismatch.",
  );
  validateLogicalRanges(workbook);
  const sourceGroups = parseMembershipWorksheet(
    requireWorksheet(workbook, "套装明细"),
  );
  const flat = sourceGroups.flatMap((group) => group.members);
  const duplicateCount =
    flat.length - new Set(flat.map((member) => member.code)).size;
  const unknownCodeCount = flat.filter(
    (member) => !formalByCode.has(member.code),
  ).length;
  const hexMismatchCount = flat.filter(
    (member) => formalByCode.get(member.code)?.hex !== member.hex,
  ).length;
  const missingOfficialCodeCount = formalColors.filter(
    (color) => !flat.some((member) => member.code === color.code),
  ).length;
  assert(
    duplicateCount === 0 &&
      unknownCodeCount === 0 &&
      hexMismatchCount === 0 &&
      missingOfficialCodeCount === 0,
    "Source membership does not reconcile with the approved Formal Palette.",
  );

  const canonicalGroups = sourceGroups.map(({ group, members }) => ({
    group,
    members: [...members].sort(
      (a, b) =>
        required(formalByCode.get(a.code)).canonicalSourceIndex -
        required(formalByCode.get(b.code)).canonicalSourceIndex,
    ),
  }));
  const canonicalMembershipBytes = canonicalGroups
    .flatMap(({ group, members }) =>
      members.map(({ code, hex }) => `${group}\t${code}\t${hex}\n`),
    )
    .join("");
  const canonicalMembershipsSha256 = hashBytes(canonicalMembershipBytes);
  assert(
    canonicalMembershipsSha256 === COLOR_SET_CANONICAL_MEMBERSHIPS_SHA256,
    "Canonical membership hash mismatch.",
  );
  const definitionsBytes = PUBLISHED_PROFILE_DEFINITIONS.map(
    (profile) =>
      `${profile.profileId}\t${profile.size}\t${profile.groups.join(",")}\n`,
  ).join("");
  const publishedProfileDefinitionsSha256 = hashBytes(definitionsBytes);
  assert(
    publishedProfileDefinitionsSha256 ===
      COLOR_SET_PUBLISHED_DEFINITIONS_SHA256,
    "Published profile definition hash mismatch.",
  );

  const profileMembershipSha256: Record<string, string> = {};
  for (const profile of PUBLISHED_PROFILE_DEFINITIONS) {
    const members = canonicalGroups
      .filter((group) => includesGroup(profile.groups, group.group))
      .flatMap((group) => group.members)
      .sort(
        (a, b) =>
          required(formalByCode.get(a.code)).canonicalSourceIndex -
          required(formalByCode.get(b.code)).canonicalSourceIndex,
      );
    const bytes = members
      .map(({ code, hex }) => `${profile.profileId}\t${code}\t${hex}\n`)
      .join("");
    profileMembershipSha256[profile.profileId] = hashBytes(bytes);
    assert(
      profileMembershipSha256[profile.profileId] ===
        PUBLISHED_PROFILE_MEMBERSHIP_SHA256[profile.profileId],
      `Profile membership hash mismatch for ${profile.profileId}.`,
    );
  }

  const groups = canonicalGroups.map(({ group, members }) => ({
    group,
    memberCodes: members
      .map(({ code }) => code)
      .sort(
        (a, b) => required(runtimeOrder.get(a)) - required(runtimeOrder.get(b)),
      ),
  }));
  const profiles = PUBLISHED_PROFILE_DEFINITIONS.map((profile) => ({
    profileId: profile.profileId,
    size: profile.size,
    groups: [...profile.groups],
    memberCodes: groups
      .filter((group) => includesGroup(profile.groups, group.group))
      .flatMap((group) => group.memberCodes)
      .sort(
        (a, b) => required(runtimeOrder.get(a)) - required(runtimeOrder.get(b)),
      ),
  }));
  const parsed = ColorSetArtifactSchema.safeParse({
    schemaVersion: "1.0.0",
    artifactVersion: "1.0.0",
    colorSetId: "poparooz-fixed-color-sets",
    colorSetVersion: "1.0.0",
    groups,
    profiles,
  });
  assert(
    parsed.success,
    "Generated Color Set Artifact failed strict validation.",
    parsed.success ? undefined : parsed.error,
  );
  const bytes = await format(JSON.stringify(parsed.data), { parser: "json" });
  return Object.freeze({
    artifact: parsed.data,
    bytes,
    sha256: hashBytes(bytes),
    sourceSha256,
    canonicalMembershipsSha256,
    publishedProfileDefinitionsSha256,
    profileMembershipSha256: Object.freeze(profileMembershipSha256),
    groupCounts: Object.freeze(groups.map((group) => group.memberCodes.length)),
    totalCount: 221,
    uniqueCount: 221,
    duplicateCount: 0,
    unknownCodeCount: 0,
    hexMismatchCount: 0,
    missingOfficialCodeCount: 0,
  });
}

function parseMembershipWorksheet(sheet: Worksheet) {
  const groups = Array.from({ length: 9 }, (_, index) => ({
    group: index + 1,
    members: [] as Array<{ code: string; hex: string }>,
  }));
  for (let row = 2; row <= 38; row += 1) {
    const group = Number(sheet.getCell(row, 1).value);
    assert(
      Number.isInteger(group) && group >= 1 && group <= 9,
      `Invalid group at row ${row}.`,
    );
    for (const codeColumn of [2, 5, 8, 11, 14, 17]) {
      const code = sheet.getCell(row, codeColumn).text.trim();
      const hex = sheet.getCell(row, codeColumn + 1).text.trim();
      if (code === "" && hex === "") continue;
      assert(
        /^[A-HM](?:[1-9]|[12][0-9]|3[0-2])$/.test(code) &&
          /^#[0-9A-F]{6}$/.test(hex),
        `Invalid membership at row ${row}.`,
      );
      required(groups[group - 1]).members.push({ code, hex });
    }
  }
  groups.forEach((group) =>
    assert(
      group.members.length === (group.group === 9 ? 29 : 24),
      `Group ${group.group} count mismatch.`,
    ),
  );
  return groups;
}

function validateLogicalRanges(workbook: ExcelJS.Workbook): void {
  const expected = new Map([
    ["221色卡", { minRow: 1, maxRow: 35, maxColumn: 26 }],
    ["替代色参考", { minRow: 1, maxRow: 72, maxColumn: 10 }],
    ["套装明细", { minRow: 2, maxRow: 44, maxColumn: 28 }],
  ]);
  for (const [name, range] of expected) {
    const sheet = requireWorksheet(workbook, name);
    const occupied: Array<{ row: number; column: number }> = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) =>
      row.eachCell({ includeEmpty: false }, (cell, column) => {
        const mergedAlias =
          cell.isMerged && cell.address !== cell.master.address;
        if (!mergedAlias && cell.text !== "")
          occupied.push({ row: rowNumber, column });
      }),
    );
    assert(
      Math.min(...occupied.map((cell) => cell.row)) === range.minRow &&
        Math.max(...occupied.map((cell) => cell.row)) === range.maxRow &&
        Math.max(...occupied.map((cell) => cell.column)) === range.maxColumn,
      `${name} logical used range mismatch.`,
    );
  }
}

function parseFormalColors(input: unknown): FormalColor[] {
  assert(
    isRecord(input) && Array.isArray(input.colors),
    "Formal Palette input is invalid.",
  );
  const colors = input.colors.map((value) => {
    assert(
      isRecord(value) &&
        typeof value.code === "string" &&
        typeof value.hex === "string" &&
        typeof value.canonicalSourceIndex === "number" &&
        Number.isInteger(value.canonicalSourceIndex),
      "Formal Palette color is invalid.",
    );
    const { code, hex, canonicalSourceIndex } = value;
    return { code, hex, canonicalSourceIndex };
  });
  assert(colors.length === 221, "Formal Palette count mismatch.");
  return colors;
}

function parseRuntimeColors(input: unknown): RuntimeColor[] {
  assert(
    isRecord(input) && Array.isArray(input.colors),
    "Runtime Palette input is invalid.",
  );
  const colors = input.colors.map((value) => {
    assert(
      isRecord(value) &&
        typeof value.code === "string" &&
        typeof value.sortOrder === "number" &&
        Number.isInteger(value.sortOrder),
      "Runtime Palette color is invalid.",
    );
    const { code, sortOrder } = value;
    return { code, sortOrder };
  });
  assert(colors.length === 221, "Runtime Palette count mismatch.");
  return colors;
}

function requireWorksheet(workbook: ExcelJS.Workbook, name: string): Worksheet {
  const sheet = workbook.getWorksheet(name);
  assert(sheet !== undefined, `Required worksheet ${name} is missing.`);
  return sheet;
}
export function hashBytes(input: Uint8Array | string): string {
  return createHash("sha256").update(input).digest("hex");
}
function required<T>(value: T | undefined): T {
  assert(value !== undefined, "Required approved value is missing.");
  return value;
}
function includesGroup(groups: readonly number[], group: number): boolean {
  return groups.includes(group);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assert(
  condition: boolean,
  message: string,
  cause?: unknown,
): asserts condition {
  if (!condition)
    throw new ColorSetCompilationError("COLOR_SET_INPUT_INVALID", message, {
      cause,
    });
}
