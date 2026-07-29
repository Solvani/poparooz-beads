import { z } from "zod";

import {
  PaletteDisplayBrandSchema,
  PaletteReferenceSystemSchema,
  PaletteSourceTypeSchema,
} from "../../src/domain/palette/palette.schema.ts";

export const PALETTE_CSV_COLUMNS = [
  "reference_system",
  "reference_code",
  "reference_name",
  "reference_series",
  "display_code",
  "display_name",
  "hex",
  "rgb_r",
  "rgb_g",
  "rgb_b",
  "lab_l",
  "lab_a",
  "lab_b",
  "is_active",
  "is_sellable",
  "is_special_finish",
  "finish_type",
  "is_auto_match_enabled",
  "product_handle",
  "variant_id",
  "pack_size",
  "sort_order",
  "source_version",
  "verified_at",
] as const;

export type PaletteCsvColumn = (typeof PALETTE_CSV_COLUMNS)[number];

export const PALETTE_CSV_COLUMN_SET: ReadonlySet<string> = new Set(
  PALETTE_CSV_COLUMNS,
);

export const OPTIONAL_PALETTE_CSV_COLUMNS: ReadonlySet<PaletteCsvColumn> =
  new Set([
    "reference_name",
    "reference_series",
    "finish_type",
    "product_handle",
    "variant_id",
    "pack_size",
    "verified_at",
  ]);

const trimmedNonEmpty = z.string().trim().min(1);

export const PaletteImportMetadataSchema = z
  .object({
    id: trimmedNonEmpty,
    referenceSystem: PaletteReferenceSystemSchema,
    displayBrand: PaletteDisplayBrandSchema,
    name: trimmedNonEmpty,
    version: trimmedNonEmpty,
    sourceType: PaletteSourceTypeSchema,
    verifiedAt: z.string().nullable().optional(),
  })
  .strict()
  .transform((metadata) => ({
    ...metadata,
    verifiedAt:
      metadata.verifiedAt === null || metadata.verifiedAt?.trim() === ""
        ? undefined
        : metadata.verifiedAt?.trim(),
  }));

export type PaletteImportMetadata = z.infer<typeof PaletteImportMetadataSchema>;

export const PALETTE_DOMAIN_TO_CSV_COLUMN = {
  referenceSystem: "reference_system",
  referenceCode: "reference_code",
  referenceName: "reference_name",
  referenceSeries: "reference_series",
  displayCode: "display_code",
  displayName: "display_name",
  hex: "hex",
  rgb: "rgb_r",
  lab: "lab_l",
  isActive: "is_active",
  isSellable: "is_sellable",
  isSpecialFinish: "is_special_finish",
  finishType: "finish_type",
  isAutoMatchEnabled: "is_auto_match_enabled",
  productHandle: "product_handle",
  variantId: "variant_id",
  packSize: "pack_size",
  sortOrder: "sort_order",
  sourceVersion: "source_version",
  verifiedAt: "verified_at",
} as const satisfies Record<string, PaletteCsvColumn>;
