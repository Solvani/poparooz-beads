import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { z } from "zod";

import {
  GENERATOR_QUALITY_BACKGROUNDS,
  GENERATOR_QUALITY_CATEGORIES,
  GENERATOR_QUALITY_SIZES,
  GENERATOR_QUALITY_TAGS,
  type GeneratorQualityCorpusManifest,
} from "./generator-quality.types.ts";

const SHA256 = /^[0-9a-f]{64}$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const LOGICAL_ID = /^[a-z0-9][a-z0-9._/-]*$/;

const inputSchema = z.strictObject({
  logicalId: z.string().regex(LOGICAL_ID),
  sha256: z.string().regex(SHA256),
  dimensions: z
    .strictObject({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  alphaClassification: z.enum([
    "opaque",
    "binary-alpha",
    "partial-alpha",
    "unknown",
  ]),
});

const caseSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  primaryCategory: z.enum(GENERATOR_QUALITY_CATEGORIES),
  tags: z.array(z.enum(GENERATOR_QUALITY_TAGS)).min(1),
  sourceKind: z.enum(["synthetic", "external-curated", "repository-approved"]),
  input: inputSchema,
  reference: z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("synthetic-mask") }),
    z.strictObject({
      type: z.literal("trusted-alpha-pair"),
      input: inputSchema,
    }),
    z.strictObject({ type: z.literal("none") }),
  ]),
  supportedBackgrounds: z.array(z.enum(GENERATOR_QUALITY_BACKGROUNDS)).min(1),
  supportedPatternSizes: z
    .array(
      z.union([
        z.literal(GENERATOR_QUALITY_SIZES[0]),
        z.literal(GENERATOR_QUALITY_SIZES[1]),
        z.literal(GENERATOR_QUALITY_SIZES[2]),
        z.literal(GENERATOR_QUALITY_SIZES[3]),
      ]),
    )
    .min(1),
  protectedFeatures: z
    .strictObject({
      preserveComponents: z.boolean().optional(),
      preserveThinFeature: z.boolean().optional(),
      preserveEndpoints: z.boolean().optional(),
    })
    .optional(),
  authorization: z.strictObject({
    storage: z.enum([
      "synthetic-in-repository",
      "external-local-only",
      "approved-in-repository",
    ]),
    status: z.enum(["approved", "pending"]),
  }),
});

const manifestSchema = z
  .strictObject({
    schemaVersion: z.literal("1.0.0"),
    corpusVersion: z.string().regex(VERSION),
    corpusStatus: z.enum(["development", "complete"]),
    cases: z.array(caseSchema).min(1),
  })
  .superRefine((manifest, context) => {
    const caseIds = new Set<string>();
    const logicalIds = new Set<string>();
    for (const [index, item] of manifest.cases.entries()) {
      if (caseIds.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: "Duplicate case id.",
          path: ["cases", index, "id"],
        });
      }
      caseIds.add(item.id);
      for (const input of [
        item.input,
        ...(item.reference.type === "trusted-alpha-pair"
          ? [item.reference.input]
          : []),
      ]) {
        if (logicalIds.has(input.logicalId)) {
          context.addIssue({
            code: "custom",
            message: "Duplicate logical input id.",
            path: ["cases", index, "input", "logicalId"],
          });
        }
        logicalIds.add(input.logicalId);
      }
      if (
        item.sourceKind === "synthetic" &&
        (item.authorization.storage !== "synthetic-in-repository" ||
          item.reference.type !== "synthetic-mask")
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Synthetic cases require repository-safe synthetic storage and mask references.",
          path: ["cases", index],
        });
      }
    }
  });

export function parseGeneratorQualityManifest(
  input: unknown,
): GeneratorQualityCorpusManifest {
  return manifestSchema.parse(input) as GeneratorQualityCorpusManifest;
}

export async function readGeneratorQualityManifest(path: string): Promise<
  Readonly<{
    manifest: GeneratorQualityCorpusManifest;
    bytes: Buffer;
    sha256: string;
  }>
> {
  const bytes = await readFile(path);
  const manifest = parseGeneratorQualityManifest(
    JSON.parse(bytes.toString("utf8")),
  );
  return Object.freeze({
    manifest,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
