import { z } from "zod";

import {
  DisplayCodeSchema,
  DisplayNameSchema,
  PaletteDisplayBrandSchema,
  PaletteFinishTypeSchema,
} from "./palette.schema";

export const PublicPaletteColorSchema = z
  .object({
    brand: PaletteDisplayBrandSchema,
    code: DisplayCodeSchema,
    name: DisplayNameSchema.optional(),
    hex: z.string().regex(/^#[0-9A-F]{6}$/, "HEX must use #RRGGBB format."),
    isSpecialFinish: z.boolean(),
    finishType: PaletteFinishTypeSchema.optional(),
  })
  .strict()
  .superRefine((color, context) => {
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
