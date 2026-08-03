import { z } from "zod";

const codeSchema = z.string().regex(/^(A|B|C|D|E|F|G|H|M)[1-9][0-9]*$/);
const hexSchema = z.string().regex(/^#[0-9A-F]{6}$/);
const rgbChannelSchema = z.number().int().min(0).max(255);
const finiteNumberSchema = z.number().finite();

export const RuntimePalettePolicySchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    paletteId: z.literal("poparooz-standard"),
    paletteVersion: z.literal("1.0.0"),
    artifactVersion: z.literal("1.0.0"),
    defaults: z
      .object({
        active: z.literal(true),
        autoMatchEligible: z.literal(true),
      })
      .strict(),
    overrides: z.array(z.never()).length(0),
  })
  .strict();

export const RuntimePaletteColorSchema = z
  .object({
    code: codeSchema,
    hex: hexSchema,
    rgb: z
      .object({ r: rgbChannelSchema, g: rgbChannelSchema, b: rgbChannelSchema })
      .strict(),
    lab: z
      .object({
        l: finiteNumberSchema.min(0).max(100),
        a: finiteNumberSchema,
        b: finiteNumberSchema,
      })
      .strict(),
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
        message: "autoMatchEligible requires active.",
      });
    }
  });

export const RuntimePaletteArtifactSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactVersion: z.literal("1.0.0"),
    paletteId: z.literal("poparooz-standard"),
    paletteVersion: z.literal("1.0.0"),
    referenceSystem: z.literal("POPAROOZ"),
    recordCount: z.literal(221),
    activeCount: z.literal(221),
    autoMatchEligibleCount: z.literal(221),
    colors: z.array(RuntimePaletteColorSchema).length(221),
  })
  .strict()
  .superRefine((artifact, context) => {
    const codes = new Set<string>();
    const orders = new Set<number>();
    artifact.colors.forEach((color, index) => {
      if (codes.has(color.code)) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "code"],
          message: "Runtime color codes must be unique.",
        });
      }
      codes.add(color.code);
      if (orders.has(color.sortOrder) || color.sortOrder !== index) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "sortOrder"],
          message: "Runtime sortOrder must be unique and contiguous.",
        });
      }
      orders.add(color.sortOrder);
    });
    if (artifact.colors.filter((color) => color.active).length !== 221) {
      context.addIssue({
        code: "custom",
        path: ["activeCount"],
        message: "activeCount does not match the Runtime colors.",
      });
    }
    if (
      artifact.colors.filter((color) => color.autoMatchEligible).length !== 221
    ) {
      context.addIssue({
        code: "custom",
        path: ["autoMatchEligibleCount"],
        message: "autoMatchEligibleCount does not match the Runtime colors.",
      });
    }
  });

export type RuntimePalettePolicy = z.infer<typeof RuntimePalettePolicySchema>;
export type RuntimePaletteArtifact = z.infer<
  typeof RuntimePaletteArtifactSchema
>;
