import { createHash } from "node:crypto";

export const FORMAL_SUBSTITUTE_LEVELS = [
  "high",
  "regular",
  "small_area_only",
] as const;

export type FormalSubstituteLevel = (typeof FORMAL_SUBSTITUTE_LEVELS)[number];

export interface NormalizedFormalSubstituteRelation {
  readonly relationId: string;
  readonly codeA: string;
  readonly hexA: string;
  readonly codeB: string;
  readonly hexB: string;
  readonly deltaE00: number;
  readonly level: FormalSubstituteLevel;
  readonly guidanceZh: string;
  readonly bidirectional: true;
  readonly sourceLocation: {
    readonly sheet: "替代色参考";
    readonly row: number;
  };
}

export interface NormalizedFormalSubstituteDataset {
  readonly schemaVersion: "1.0.0";
  readonly substituteDatasetId: "poparooz-substitute-reference";
  readonly substituteDatasetVersion: "1.0.0";
  readonly relationCount: 67;
  readonly status: "reference_only";
  readonly physicalValidationStatus: "unverified";
  readonly applicationPolicy: "disabled";
  readonly directionPolicy: "worksheet_declared_bidirectional";
  readonly sourceFileName: "Poparooz色卡.xlsx";
  readonly sourceFileSha256: string;
  readonly canonicalRecordsSha256: string;
  readonly relations: readonly NormalizedFormalSubstituteRelation[];
}

export function serializeCanonicalFormalSubstituteRecords(
  relations: readonly NormalizedFormalSubstituteRelation[],
): string {
  const records = relations.map((relation) => ({
    relationId: relation.relationId,
    codeA: relation.codeA,
    hexA: relation.hexA,
    codeB: relation.codeB,
    hexB: relation.hexB,
    deltaE00: relation.deltaE00,
    level: relation.level,
    guidanceZh: relation.guidanceZh,
    bidirectional: relation.bidirectional,
    sourceLocation: {
      sheet: relation.sourceLocation.sheet,
      row: relation.sourceLocation.row,
    },
  }));

  return `${JSON.stringify(records, null, 2)}\n`;
}

export function hashCanonicalFormalSubstituteRecords(
  relations: readonly NormalizedFormalSubstituteRelation[],
): string {
  return createHash("sha256")
    .update(serializeCanonicalFormalSubstituteRecords(relations))
    .digest("hex");
}
