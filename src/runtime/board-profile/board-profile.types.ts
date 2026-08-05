export type ApprovedBoardProfileArtifact = Readonly<{
  id: "poparooz-board-104";
  version: "1.0.0";
  status: "approved";
  shape: "square";
  pegGrid: Readonly<{
    columns: 104;
    rows: 104;
  }>;
  outerDimensionsMm: Readonly<{
    width: 280;
    height: 280;
    thickness: 2;
  }>;
  firstToLastPegCenterSpanMm: 278;
  internalPegIntervalCount: 103;
  tiling: Readonly<{
    supported: true;
    sharedEdgePegs: false;
    seamAdjacentPegCenterDistanceMm: 2.3;
    seamType: "non-uniform";
  }>;
}>;

export type ApprovedBoardProfileSnapshot = ApprovedBoardProfileArtifact;

export interface ApprovedBoardProfileProvider {
  getSnapshot(): ApprovedBoardProfileSnapshot;
}
