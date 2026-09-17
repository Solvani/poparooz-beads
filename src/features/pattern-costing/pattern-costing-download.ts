import type { PatternCostingArtifact } from "./pattern-costing-export";

export interface PatternCostingDownloadEnvironment {
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
  readonly triggerDownload: (url: string, filename: string) => void;
}

export function downloadPatternCostingArtifact(
  artifact: PatternCostingArtifact,
  environment: PatternCostingDownloadEnvironment = browserEnvironment,
): void {
  const url = environment.createObjectURL(artifact.blob);
  try {
    environment.triggerDownload(url, artifact.filename);
  } finally {
    environment.revokeObjectURL(url);
  }
}

const browserEnvironment: PatternCostingDownloadEnvironment = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  triggerDownload: (url, filename) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.click();
  },
};
