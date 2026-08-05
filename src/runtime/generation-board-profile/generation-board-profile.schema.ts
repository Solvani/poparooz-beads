import { z } from "zod";

import { GenerationBoardProfileError } from "./generation-board-profile.errors";
import type { GenerationBoardProfileSnapshot } from "./generation-board-profile.types";

export const GenerationBoardProfileSnapshotSchema = z
  .object({
    id: z.literal("poparooz-board-104"),
    version: z.literal("1.0.0"),
    shape: z.literal("square"),
    pegGrid: z
      .object({
        columns: z.literal(104),
        rows: z.literal(104),
      })
      .strict(),
    tiling: z
      .object({
        supported: z.literal(true),
        sharedEdgePegs: z.literal(false),
      })
      .strict(),
  })
  .strict();

export function parseGenerationBoardProfileSnapshot(
  input: unknown,
): GenerationBoardProfileSnapshot {
  const result = GenerationBoardProfileSnapshotSchema.safeParse(input);
  if (!result.success) {
    throw new GenerationBoardProfileError(
      "GENERATION_BOARD_PROFILE_OUTPUT_INVALID",
    );
  }
  return Object.freeze({
    id: result.data.id,
    version: result.data.version,
    shape: result.data.shape,
    pegGrid: Object.freeze({
      columns: result.data.pegGrid.columns,
      rows: result.data.pegGrid.rows,
    }),
    tiling: Object.freeze({
      supported: result.data.tiling.supported,
      sharedEdgePegs: result.data.tiling.sharedEdgePegs,
    }),
  });
}
