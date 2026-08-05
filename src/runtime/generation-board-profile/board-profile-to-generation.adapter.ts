import { BoardProfileBrowserError } from "../board-profile/board-profile.errors";
import { parseApprovedBoardProfileArtifact } from "../board-profile/board-profile.schema";
import type { ApprovedBoardProfileSnapshot } from "../board-profile/board-profile.types";
import { GenerationBoardProfileError } from "./generation-board-profile.errors";
import { parseGenerationBoardProfileSnapshot } from "./generation-board-profile.schema";
import type { GenerationBoardProfileSnapshot } from "./generation-board-profile.types";

export function adaptBoardProfileToGeneration(
  input: ApprovedBoardProfileSnapshot,
): GenerationBoardProfileSnapshot {
  let approved: ApprovedBoardProfileSnapshot;
  try {
    approved = parseApprovedBoardProfileArtifact(input);
  } catch (error) {
    if (
      error instanceof BoardProfileBrowserError &&
      error.code === "BOARD_PROFILE_IDENTITY_MISMATCH"
    ) {
      throw new GenerationBoardProfileError(
        "GENERATION_BOARD_PROFILE_IDENTITY_MISMATCH",
      );
    }
    throw new GenerationBoardProfileError(
      "GENERATION_BOARD_PROFILE_INPUT_INVALID",
    );
  }

  return parseGenerationBoardProfileSnapshot({
    id: approved.id,
    version: approved.version,
    shape: approved.shape,
    pegGrid: {
      columns: approved.pegGrid.columns,
      rows: approved.pegGrid.rows,
    },
    tiling: {
      supported: approved.tiling.supported,
      sharedEdgePegs: approved.tiling.sharedEdgePegs,
    },
  });
}
