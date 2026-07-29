import { z } from "zod";

const paletteCodePattern = /^[A-Z0-9][A-Z0-9._-]*$/;
const hexPattern = /^#[0-9A-F]{6}$/;

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} must not be empty.`);

const FiniteLabNumberSchema = z.custom<number>(
  (value) => typeof value === "number" && Number.isFinite(value),
  "Lab channels must be finite.",
);

export const PaletteBrandSchema = z.literal("MARD");

export const PaletteFinishTypeSchema = z.enum([
  "transparent",
  "glow",
  "pearl",
  "metallic",
  "fluorescent",
  "glitter",
  "other",
]);

export const PaletteSourceTypeSchema = z.enum([
  "reference",
  "supplier",
  "verified",
]);

export const VerifiedAtSchema = z
  .string()
  .refine(
    (value) =>
      z.iso.date().safeParse(value).success ||
      z.iso.datetime({ offset: true }).safeParse(value).success,
    "verifiedAt must be an ISO 8601 date or datetime.",
  );

const RgbSchema = z.tuple([
  z
    .number()
    .int("RGB channels must be integers.")
    .min(0, "RGB channels must be between 0 and 255.")
    .max(255, "RGB channels must be between 0 and 255."),
  z
    .number()
    .int("RGB channels must be integers.")
    .min(0, "RGB channels must be between 0 and 255.")
    .max(255, "RGB channels must be between 0 and 255."),
  z
    .number()
    .int("RGB channels must be integers.")
    .min(0, "RGB channels must be between 0 and 255.")
    .max(255, "RGB channels must be between 0 and 255."),
]);

const LabSchema = z.tuple([
  FiniteLabNumberSchema.refine(
    (value) => value >= 0 && value <= 100,
    "Lab L must be between 0 and 100.",
  ),
  FiniteLabNumberSchema,
  FiniteLabNumberSchema,
]);

function rgbToHex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export const PaletteColorSchema = z
  .object({
    brand: PaletteBrandSchema,
    code: nonEmptyString("code")
      .transform((code) => code.toUpperCase())
      .pipe(
        z
          .string()
          .regex(
            paletteCodePattern,
            "code may contain only letters, numbers, dots, underscores, and hyphens.",
          ),
      ),
    name: nonEmptyString("name"),
    series: nonEmptyString("series"),
    hex: nonEmptyString("hex")
      .transform((hex) => hex.toUpperCase())
      .pipe(
        z
          .string()
          .regex(hexPattern, "HEX must use the canonical #RRGGBB format."),
      ),
    rgb: RgbSchema,
    lab: LabSchema,
    isActive: z.boolean(),
    isSellable: z.boolean(),
    isSpecialFinish: z.boolean(),
    finishType: PaletteFinishTypeSchema.optional(),
    isAutoMatchEnabled: z.boolean(),
    productHandle: nonEmptyString("productHandle").optional(),
    variantId: nonEmptyString("variantId").optional(),
    packSize: z
      .number()
      .int("packSize must be a positive integer.")
      .positive("packSize must be a positive integer.")
      .optional(),
    sortOrder: z
      .number()
      .int("sortOrder must be a non-negative integer.")
      .nonnegative("sortOrder must be a non-negative integer."),
    sourceVersion: nonEmptyString("sourceVersion"),
    verifiedAt: VerifiedAtSchema.optional(),
  })
  .strict()
  .superRefine((color, context) => {
    if (color.hex !== rgbToHex(color.rgb)) {
      context.addIssue({
        code: "custom",
        path: ["hex"],
        message: "HEX must match the RGB channels.",
      });
    }

    if (color.isAutoMatchEnabled && !color.isActive) {
      context.addIssue({
        code: "custom",
        path: ["isAutoMatchEnabled"],
        message: "Automatic matching requires an active color.",
      });
    }

    if (color.isAutoMatchEnabled && !color.isSellable) {
      context.addIssue({
        code: "custom",
        path: ["isAutoMatchEnabled"],
        message: "Automatic matching requires a sellable color.",
      });
    }

    if (color.isSpecialFinish && color.finishType === undefined) {
      context.addIssue({
        code: "custom",
        path: ["finishType"],
        message: "Special-finish colors require a finishType.",
      });
    }

    if (!color.isSpecialFinish && color.finishType !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["finishType"],
        message: "Plain colors must not define a finishType.",
      });
    }
  });

export const PaletteDefinitionSchema = z
  .object({
    id: nonEmptyString("id"),
    brand: PaletteBrandSchema,
    name: nonEmptyString("name"),
    version: nonEmptyString("version"),
    colorCount: z
      .number()
      .int("colorCount must be a non-negative integer.")
      .nonnegative("colorCount must be a non-negative integer."),
    sourceType: PaletteSourceTypeSchema,
    verifiedAt: VerifiedAtSchema.optional(),
    colors: z
      .array(PaletteColorSchema)
      .min(1, "A palette must contain at least one color."),
  })
  .strict()
  .superRefine((palette, context) => {
    if (palette.colorCount !== palette.colors.length) {
      context.addIssue({
        code: "custom",
        path: ["colorCount"],
        message: "colorCount must equal colors.length.",
      });
    }

    if (palette.sourceType === "verified" && palette.verifiedAt === undefined) {
      context.addIssue({
        code: "custom",
        path: ["verifiedAt"],
        message: "Verified palettes require verifiedAt.",
      });
    }

    const codeIndexes = new Map<string, number>();

    palette.colors.forEach((color, index) => {
      const firstIndex = codeIndexes.get(color.code);

      if (firstIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "code"],
          message: `Duplicate normalized color code "${color.code}"; first used at colors.${firstIndex}.code.`,
        });
      } else {
        codeIndexes.set(color.code, index);
      }

      if (color.brand !== palette.brand) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "brand"],
          message: "Color brand must match the palette brand.",
        });
      }

      if (color.sourceVersion !== palette.version) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "sourceVersion"],
          message: "Color sourceVersion must equal the palette version.",
        });
      }
    });
  });
