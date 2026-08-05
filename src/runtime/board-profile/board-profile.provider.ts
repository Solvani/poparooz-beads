import { BoardProfileBrowserError } from "./board-profile.errors";
import { parseApprovedBoardProfileArtifact } from "./board-profile.schema";
import type {
  ApprovedBoardProfileArtifact,
  ApprovedBoardProfileProvider,
  ApprovedBoardProfileSnapshot,
} from "./board-profile.types";

export function createApprovedBoardProfileProviderFromArtifact(
  input: unknown,
): ApprovedBoardProfileProvider {
  try {
    const artifact = parseApprovedBoardProfileArtifact(input);
    const snapshot = createImmutableSnapshot(artifact);
    return Object.freeze({ getSnapshot: () => snapshot });
  } catch (error) {
    if (error instanceof BoardProfileBrowserError) throw error;
    throw new BoardProfileBrowserError(
      "BOARD_PROFILE_PROVIDER_INITIALIZATION_FAILED",
    );
  }
}

function createImmutableSnapshot(
  artifact: ApprovedBoardProfileArtifact,
): ApprovedBoardProfileSnapshot {
  return Object.freeze({
    id: artifact.id,
    version: artifact.version,
    status: artifact.status,
    shape: artifact.shape,
    pegGrid: Object.freeze({
      columns: artifact.pegGrid.columns,
      rows: artifact.pegGrid.rows,
    }),
    outerDimensionsMm: Object.freeze({
      width: artifact.outerDimensionsMm.width,
      height: artifact.outerDimensionsMm.height,
      thickness: artifact.outerDimensionsMm.thickness,
    }),
    firstToLastPegCenterSpanMm: artifact.firstToLastPegCenterSpanMm,
    internalPegIntervalCount: artifact.internalPegIntervalCount,
    tiling: Object.freeze({
      supported: artifact.tiling.supported,
      sharedEdgePegs: artifact.tiling.sharedEdgePegs,
      seamAdjacentPegCenterDistanceMm:
        artifact.tiling.seamAdjacentPegCenterDistanceMm,
      seamType: artifact.tiling.seamType,
    }),
  });
}
