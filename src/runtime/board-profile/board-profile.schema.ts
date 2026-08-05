import { z } from "zod";

import { BoardProfileBrowserError } from "./board-profile.errors";
import type { ApprovedBoardProfileArtifact } from "./board-profile.types";

export const ApprovedBoardProfileArtifactSchema = z
  .object({
    id: z.literal("poparooz-board-104"),
    version: z.literal("1.0.0"),
    status: z.literal("approved"),
    shape: z.literal("square"),
    pegGrid: z
      .object({
        columns: z.literal(104),
        rows: z.literal(104),
      })
      .strict(),
    outerDimensionsMm: z
      .object({
        width: z.literal(280),
        height: z.literal(280),
        thickness: z.literal(2),
      })
      .strict(),
    firstToLastPegCenterSpanMm: z.literal(278),
    internalPegIntervalCount: z.literal(103),
    tiling: z
      .object({
        supported: z.literal(true),
        sharedEdgePegs: z.literal(false),
        seamAdjacentPegCenterDistanceMm: z.literal(2.3),
        seamType: z.literal("non-uniform"),
      })
      .strict(),
  })
  .strict();

export function parseApprovedBoardProfileArtifact(
  input: unknown,
): ApprovedBoardProfileArtifact {
  const result = ApprovedBoardProfileArtifactSchema.safeParse(input);
  if (result.success) return result.data;

  const firstPath = result.error.issues[0]?.path[0];
  if (
    firstPath === "id" ||
    firstPath === "version" ||
    firstPath === "status" ||
    firstPath === "shape"
  ) {
    throw new BoardProfileBrowserError("BOARD_PROFILE_IDENTITY_MISMATCH");
  }
  if (
    firstPath === "pegGrid" ||
    firstPath === "outerDimensionsMm" ||
    firstPath === "firstToLastPegCenterSpanMm" ||
    firstPath === "internalPegIntervalCount" ||
    firstPath === "tiling"
  ) {
    throw new BoardProfileBrowserError("BOARD_PROFILE_VALUE_MISMATCH");
  }
  throw new BoardProfileBrowserError("BOARD_PROFILE_SCHEMA_INVALID");
}
