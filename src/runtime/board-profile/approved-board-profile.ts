import approvedBoardProfile from "./artifacts/poparooz-board-104/1.0.0/board-profile.json";
import { createApprovedBoardProfileProviderFromArtifact } from "./board-profile.provider";
import type { ApprovedBoardProfileProvider } from "./board-profile.types";

export function createApprovedBoardProfileProvider(): ApprovedBoardProfileProvider {
  return createApprovedBoardProfileProviderFromArtifact(approvedBoardProfile);
}
