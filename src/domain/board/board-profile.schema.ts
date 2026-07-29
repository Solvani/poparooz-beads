import { z } from "zod";

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} must not be empty.`);

const positiveInteger = (fieldName: string) =>
  z
    .number()
    .int(`${fieldName} must be a positive integer.`)
    .positive(`${fieldName} must be a positive integer.`);

const FiniteNumberSchema = z.custom<number>(
  (value) => typeof value === "number" && Number.isFinite(value),
  "beadSizeMm must be finite.",
);

export const BoardProfileSchema = z
  .object({
    id: nonEmptyString("id"),
    name: nonEmptyString("name"),
    columns: positiveInteger("columns"),
    rows: positiveInteger("rows"),
    beadSizeMm: FiniteNumberSchema.refine(
      (value) => value > 0,
      "beadSizeMm must be positive.",
    ),
    isDefault: z.boolean(),
    isActive: z.boolean(),
  })
  .strict();
