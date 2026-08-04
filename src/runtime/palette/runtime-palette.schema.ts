import { z } from "zod";

import { RuntimePaletteBrowserError } from "./runtime-palette.errors";
import type { RuntimePaletteArtifact } from "./runtime-palette.types";

const runtimeCodeSchema = z
  .string()
  .min(1)
  .regex(/^(A|B|C|D|E|F|G|H|M)[1-9][0-9]*$/);
const hexSchema = z.string().regex(/^#[0-9A-F]{6}$/);
const rgbChannelSchema = z.number().int().min(0).max(255);
const finiteLabNumberSchema = z.number().finite();

export const RuntimePaletteColorSchema = z
  .object({
    code: runtimeCodeSchema,
    hex: hexSchema,
    rgb: z
      .object({
        r: rgbChannelSchema,
        g: rgbChannelSchema,
        b: rgbChannelSchema,
      })
      .strict(),
    lab: z
      .object({
        l: finiteLabNumberSchema.min(0).max(100),
        a: finiteLabNumberSchema,
        b: finiteLabNumberSchema,
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
        message: "POLICY_INVALID",
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
    const codeIndexes = new Map<string, number>();
    const sortOrders = new Set<number>();
    let activeCount = 0;
    let eligibleCount = 0;

    artifact.colors.forEach((color, index) => {
      if (codeIndexes.has(color.code)) {
        context.addIssue({
          code: "custom",
          path: ["colors", index, "code"],
          message: "DUPLICATE_CODE",
        });
      } else {
        codeIndexes.set(color.code, index);
      }
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

    if (activeCount !== artifact.activeCount) {
      context.addIssue({
        code: "custom",
        path: ["activeCount"],
        message: "COUNT_MISMATCH",
      });
    }
    if (eligibleCount !== artifact.autoMatchEligibleCount) {
      context.addIssue({
        code: "custom",
        path: ["autoMatchEligibleCount"],
        message: "COUNT_MISMATCH",
      });
    }
  });

export function parseRuntimePaletteArtifact(
  input: unknown,
): RuntimePaletteArtifact {
  const result = RuntimePaletteArtifactSchema.safeParse(input);
  if (!result.success) {
    throw browserErrorForIssue(result.error.issues[0]);
  }
  return result.data;
}

function browserErrorForIssue(issue: z.core.$ZodIssue | undefined) {
  const recordIndex =
    issue !== undefined &&
    issue.path[0] === "colors" &&
    typeof issue.path[1] === "number"
      ? issue.path[1]
      : undefined;
  const fieldValue = issue?.path.at(-1);
  const details = {
    field: typeof fieldValue === "string" ? fieldValue : undefined,
    recordIndex,
  };
  if (issue?.message === "DUPLICATE_CODE") {
    return new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_DUPLICATE_CODE",
      details,
    );
  }
  if (issue?.message === "SORT_ORDER_INVALID") {
    return new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_SORT_ORDER_INVALID",
      details,
    );
  }
  if (issue?.message === "POLICY_INVALID") {
    return new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_POLICY_INVALID",
      details,
    );
  }
  if (
    issue?.message === "COUNT_MISMATCH" ||
    issue?.path[0] === "recordCount" ||
    issue?.path[0] === "activeCount" ||
    issue?.path[0] === "autoMatchEligibleCount" ||
    (issue?.path[0] === "colors" && recordIndex === undefined)
  ) {
    return new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_COUNT_MISMATCH",
      details,
    );
  }
  if (
    issue?.path[0] === "schemaVersion" ||
    issue?.path[0] === "artifactVersion" ||
    issue?.path[0] === "paletteId" ||
    issue?.path[0] === "paletteVersion" ||
    issue?.path[0] === "referenceSystem"
  ) {
    return new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_IDENTITY_MISMATCH",
      details,
    );
  }
  if (recordIndex !== undefined) {
    return new RuntimePaletteBrowserError(
      "RUNTIME_PALETTE_COLOR_INVALID",
      details,
    );
  }
  return new RuntimePaletteBrowserError(
    "RUNTIME_PALETTE_SCHEMA_INVALID",
    details,
  );
}
