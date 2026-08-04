import { z } from "zod";

import { GenerationPaletteAdapterError } from "./generation-palette.errors";
import type { GenerationPaletteSnapshot } from "./generation-palette.types";

const generationCodeSchema = z
  .string()
  .min(1)
  .regex(/^(A|B|C|D|E|F|G|H|M)[1-9][0-9]*$/);
const hexSchema = z.string().regex(/^#[0-9A-F]{6}$/);
const rgbChannelSchema = z.number().int().min(0).max(255);
const finiteLabNumberSchema = z.number().finite();

export const GenerationPaletteColorSchema = z
  .object({
    code: generationCodeSchema,
    hex: hexSchema,
    rgb: z.tuple([rgbChannelSchema, rgbChannelSchema, rgbChannelSchema]),
    lab: z.tuple([
      finiteLabNumberSchema.min(0).max(100),
      finiteLabNumberSchema,
      finiteLabNumberSchema,
    ]),
    sortOrder: z.number().int().nonnegative(),
    active: z.boolean(),
    autoMatchEligible: z.boolean(),
  })
  .strict()
  .superRefine((color, context) => {
    if (color.autoMatchEligible && !color.active) {
      context.addIssue({
        code: "custom",
        path: ["autoMatchEligible"],
        message: "POLICY_INVALID",
      });
    }
  });

export const GenerationPaletteSnapshotSchema = z
  .object({
    identity: z
      .object({
        schemaVersion: z.literal("1.0.0"),
        artifactVersion: z.literal("1.0.0"),
        paletteId: z.literal("poparooz-standard"),
        paletteVersion: z.literal("1.0.0"),
      })
      .strict(),
    recordCount: z.literal(221),
    activeCount: z.literal(221),
    autoMatchEligibleCount: z.literal(221),
    colors: z.array(GenerationPaletteColorSchema).length(221),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const codes = new Set<string>();
    const sortOrders = new Set<number>();
    let activeCount = 0;
    let eligibleCount = 0;

    snapshot.colors.forEach((color, index) => {
      if (codes.has(color.code)) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "code"],
          message: "DUPLICATE_CODE",
        });
      }
      codes.add(color.code);

      if (sortOrders.has(color.sortOrder) || color.sortOrder !== index) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "sortOrder"],
          message: "SORT_ORDER_INVALID",
        });
      }
      sortOrders.add(color.sortOrder);

      if (color.active) activeCount += 1;
      if (color.autoMatchEligible) eligibleCount += 1;
    });

    if (
      activeCount !== snapshot.activeCount ||
      eligibleCount !== snapshot.autoMatchEligibleCount
    ) {
      context.addIssue({
        code: "custom",
        path: ["colors"],
        message: "COUNT_MISMATCH",
      });
    }
  });

export function parseGenerationPaletteSnapshot(
  input: unknown,
): GenerationPaletteSnapshot {
  const result = GenerationPaletteSnapshotSchema.safeParse(input);
  if (!result.success) {
    throw new GenerationPaletteAdapterError(
      "GENERATION_PALETTE_OUTPUT_INVALID",
    );
  }
  return result.data;
}
