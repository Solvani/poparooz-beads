import { describe, expect, it, vi } from "vitest";

import { downloadPatternCostingArtifact } from "./pattern-costing-download";

describe("PatternCosting local download", () => {
  it("downloads and always revokes the browser-local object URL", () => {
    const environment = {
      createObjectURL: vi.fn(() => "blob:local"),
      revokeObjectURL: vi.fn(),
      triggerDownload: vi.fn(),
    };
    downloadPatternCostingArtifact(
      {
        payload: {} as never,
        serialized: "{}",
        bytes: new Uint8Array(),
        blob: new Blob(["{}"]),
        filename: "pattern.json",
      },
      environment,
    );
    expect(environment.triggerDownload).toHaveBeenCalledWith(
      "blob:local",
      "pattern.json",
    );
    expect(environment.revokeObjectURL).toHaveBeenCalledWith("blob:local");
  });
});
