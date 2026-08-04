import { z } from "zod";

import { POPAROOZ_COLOR_CODE_PATTERN } from "../../../src/domain/color/poparooz-color-code.ts";
import { DisplayNameSchema } from "../../../src/domain/palette/palette.schema.ts";
import { formalIssueMessage } from "./formal-palette-errors.ts";

export const FORMAL_PALETTE_SERIES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "M",
] as const;

const sha256Pattern = /^[0-9a-f]{64}$/;
const canonicalHexPattern = /^#[0-9A-F]{6}$/;
const safeIdentifierPattern = /^[a-z0-9][a-z0-9._-]*$/;
const safeFileNamePattern = /^[^<>:"/\\|?*\u0000-\u001F]+$/;
const thirdPartyBrandPattern = /MARD/i;

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} must not be empty.`);

const safeInteger = z.number().int().safe();

export const FormalPaletteSeriesSchema = z.enum(FORMAL_PALETTE_SERIES);
export const FormalPaletteStatusSchema = z.enum([
  "draft",
  "approved",
  "superseded",
  "retired",
]);
export const DisplayNameStatusSchema = z.enum([
  "not_provided",
  "draft",
  "under_review",
  "approved",
  "rejected",
  "retired",
]);
export const DigitalColorStatusSchema = z.literal("source_declared");
export const PhysicalColorStatusSchema = z.literal("unverified");

const Sha256Schema = z
  .string()
  .regex(
    sha256Pattern,
    formalIssueMessage(
      "INVALID_SOURCE_HASH",
      "SHA-256 values must be 64 lowercase hexadecimal characters.",
    ),
  );

export const FormalPaletteManifestSchema = z
  .object({
    schemaVersion: nonEmptyString("schemaVersion"),
    paletteId: z
      .string()
      .regex(safeIdentifierPattern, "paletteId contains unsafe characters."),
    paletteVersion: nonEmptyString("paletteVersion"),
    brand: z.literal("Poparooz"),
    referenceSystem: z.literal("POPAROOZ"),
    recordCount: safeInteger.positive(),
    seriesOrder: z.array(FormalPaletteSeriesSchema).min(1),
    sourceFileName: z
      .string()
      .min(1, "sourceFileName must not be empty.")
      .regex(
        safeFileNamePattern,
        "sourceFileName must be a plain safe file name without a path.",
      ),
    sourceFileSha256: Sha256Schema,
    canonicalRecordsSha256: Sha256Schema,
    digitalColorPolicy: z.literal("source_declared"),
    physicalColorPolicy: z.literal("unverified"),
    displayNamePolicy: z.literal("optional_approved_only"),
    status: FormalPaletteStatusSchema,
    createdAt: z.iso.datetime({ offset: true }),
    approvedAt: z.iso.datetime({ offset: true }).optional(),
    approvedBy: nonEmptyString("approvedBy").optional(),
    supersedes: nonEmptyString("supersedes").optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const firstSeriesIndexes = new Map<string, number>();
    manifest.seriesOrder.forEach((series, index) => {
      const firstIndex = firstSeriesIndexes.get(series);
      if (firstIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["seriesOrder", index],
          message: formalIssueMessage(
            "DUPLICATE_SERIES",
            `Series ${series} duplicates seriesOrder.${firstIndex}.`,
          ),
        });
      } else {
        firstSeriesIndexes.set(series, index);
      }
    });

    const exactOrder =
      manifest.seriesOrder.length === FORMAL_PALETTE_SERIES.length &&
      manifest.seriesOrder.every(
        (series, index) => series === FORMAL_PALETTE_SERIES[index],
      );
    if (!exactOrder) {
      context.addIssue({
        code: "custom",
        path: ["seriesOrder"],
        message: formalIssueMessage(
          "INVALID_MANIFEST",
          `seriesOrder must be ${FORMAL_PALETTE_SERIES.join(",")}.`,
        ),
      });
    }

    const isApproved = manifest.status === "approved";
    if (
      isApproved &&
      (manifest.approvedAt === undefined || manifest.approvedBy === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: formalIssueMessage(
          "INVALID_MANIFEST",
          "Approved manifests require approvedAt and approvedBy.",
        ),
      });
    }

    if (
      !isApproved &&
      (manifest.approvedAt !== undefined || manifest.approvedBy !== undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: formalIssueMessage(
          "INVALID_MANIFEST",
          "Approval fields are allowed only when status is approved.",
        ),
      });
    }
  });

export const NormalizedFormalPaletteColorSchema = z
  .object({
    code: z
      .string()
      .regex(
        POPAROOZ_COLOR_CODE_PATTERN,
        formalIssueMessage(
          "CODE_SERIES_MISMATCH",
          "code must be an approved uppercase series followed by a positive integer without leading zeroes.",
        ),
      ),
    series: FormalPaletteSeriesSchema,
    seriesNumber: safeInteger.positive(),
    seriesRank: safeInteger.nonnegative(),
    canonicalSourceIndex: safeInteger.nonnegative(),
    hex: z
      .string()
      .regex(
        canonicalHexPattern,
        formalIssueMessage(
          "INVALID_HEX",
          "hex must use strict uppercase #RRGGBB format.",
        ),
      ),
    displayName: DisplayNameSchema.optional(),
    displayNameStatus: DisplayNameStatusSchema,
    digitalColorStatus: DigitalColorStatusSchema,
    physicalColorStatus: PhysicalColorStatusSchema,
    sourceLocation: z
      .object({
        sheet: nonEmptyString("sourceLocation.sheet").refine(
          (sheet) => !thirdPartyBrandPattern.test(sheet),
          "sourceLocation.sheet must not contain a third-party brand name.",
        ),
        row: safeInteger.positive(),
        column: safeInteger.positive(),
      })
      .strict(),
  })
  .strict()
  .superRefine((color, context) => {
    if (color.code !== `${color.series}${color.seriesNumber}`) {
      context.addIssue({
        code: "custom",
        path: ["code"],
        message: formalIssueMessage(
          "CODE_SERIES_MISMATCH",
          `code ${color.code} must equal series + seriesNumber (${color.series}${color.seriesNumber}).`,
        ),
      });
    }

    if (
      color.displayNameStatus === "not_provided" &&
      color.displayName !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["displayNameStatus"],
        message: formalIssueMessage(
          "INVALID_DISPLAY_NAME_STATE",
          "not_provided requires displayName to be absent.",
        ),
      });
    }

    if (
      color.displayNameStatus === "approved" &&
      color.displayName === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["displayNameStatus"],
        message: formalIssueMessage(
          "INVALID_DISPLAY_NAME_STATE",
          "approved requires a valid displayName.",
        ),
      });
    }
  });

export const NormalizedFormalPaletteSchema = z
  .object({
    manifest: FormalPaletteManifestSchema,
    colors: z.array(NormalizedFormalPaletteColorSchema).min(1),
  })
  .strict()
  .superRefine((palette, context) => {
    if (palette.manifest.recordCount !== palette.colors.length) {
      context.addIssue({
        code: "custom",
        path: ["manifest", "recordCount"],
        message: formalIssueMessage(
          "RECORD_COUNT_MISMATCH",
          `recordCount ${palette.manifest.recordCount} does not equal colors.length ${palette.colors.length}.`,
        ),
      });
    }

    const codeIndexes = new Map<string, number>();
    const hexIndexes = new Map<string, { index: number; code: string }>();
    const canonicalIndexes = new Map<number, { index: number; code: string }>();

    palette.colors.forEach((color, index) => {
      const firstCodeIndex = codeIndexes.get(color.code);
      if (firstCodeIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "code"],
          message: formalIssueMessage(
            "DUPLICATE_CODE",
            `Code ${color.code} duplicates colors.${firstCodeIndex}.code.`,
          ),
        });
      } else {
        codeIndexes.set(color.code, index);
      }

      const firstHex = hexIndexes.get(color.hex);
      if (firstHex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "hex"],
          message: formalIssueMessage(
            "DUPLICATE_HEX",
            `HEX ${color.hex} for ${color.code} duplicates ${firstHex.code} at colors.${firstHex.index}.hex.`,
          ),
        });
      } else {
        hexIndexes.set(color.hex, { index, code: color.code });
      }

      const firstCanonicalIndex = canonicalIndexes.get(
        color.canonicalSourceIndex,
      );
      if (firstCanonicalIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "canonicalSourceIndex"],
          message: formalIssueMessage(
            "DUPLICATE_CANONICAL_INDEX",
            `canonicalSourceIndex ${color.canonicalSourceIndex} for ${color.code} duplicates ${firstCanonicalIndex.code} at colors.${firstCanonicalIndex.index}.canonicalSourceIndex.`,
          ),
        });
      } else {
        canonicalIndexes.set(color.canonicalSourceIndex, {
          index,
          code: color.code,
        });
      }

      const expectedRank = palette.manifest.seriesOrder.indexOf(color.series);
      if (expectedRank < 0) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "series"],
          message: formalIssueMessage(
            "UNKNOWN_SERIES",
            `Series ${color.series} is absent from manifest.seriesOrder.`,
          ),
        });
      } else if (color.seriesRank !== expectedRank) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "seriesRank"],
          message: formalIssueMessage(
            "SERIES_RANK_MISMATCH",
            `seriesRank ${color.seriesRank} for ${color.code} must be ${expectedRank}.`,
          ),
        });
      }
    });

    const actualIndexes = [...canonicalIndexes.keys()].sort((a, b) => a - b);
    const expectedIndexes = Array.from(
      { length: palette.colors.length },
      (_, index) => index,
    );
    if (
      actualIndexes.length !== expectedIndexes.length ||
      actualIndexes.some((value, index) => value !== expectedIndexes[index])
    ) {
      context.addIssue({
        code: "custom",
        path: ["colors"],
        message: formalIssueMessage(
          "NON_CONTIGUOUS_CANONICAL_INDEX",
          `canonicalSourceIndex values must form 0..${palette.colors.length - 1}.`,
        ),
      });
    }
  });
