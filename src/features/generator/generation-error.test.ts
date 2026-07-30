import { describe, expect, it } from "vitest";

import { ImagePipelineError } from "../../domain/image/image-errors";
import { PatternAssemblyError } from "../../domain/pattern/pattern-errors";
import { QuantizationWorkerError } from "../../lib/quantization-worker/quantization-worker.errors";
import {
  isGenerationCancellation,
  toSafeGenerationError,
} from "./generation-error";

describe("generation error mapping", () => {
  it("maps known image, worker, and pattern failures to safe messages", () => {
    expect(
      toSafeGenerationError(
        new ImagePipelineError("MIME_SIGNATURE_MISMATCH", "raw"),
      ),
    ).toMatchObject({ code: "unsupported-image" });
    expect(
      toSafeGenerationError(new ImagePipelineError("FILE_TOO_LARGE", "raw")),
    ).toMatchObject({ code: "image-too-large" });
    expect(
      toSafeGenerationError(
        new ImagePipelineError("UPSCALE_NOT_ALLOWED", "raw"),
      ),
    ).toMatchObject({ code: "invalid-settings" });
    expect(
      toSafeGenerationError(
        new QuantizationWorkerError("WORKER_CRASHED", "raw"),
      ),
    ).toMatchObject({ code: "worker-failed" });
    expect(
      toSafeGenerationError(
        new PatternAssemblyError("INVALID_PATTERN_RESULT", "raw"),
      ),
    ).toMatchObject({ code: "pattern-failed" });
  });

  it("never exposes an unknown raw exception", () => {
    const mapped = toSafeGenerationError(
      new Error("C:\\private\\photo.png stack"),
    );
    expect(mapped.code).toBe("unknown");
    expect(mapped.message).not.toContain("private");
    expect(mapped.message).not.toContain("stack");
  });

  it("classifies Phase 1 abort and supersede outcomes separately", () => {
    expect(
      isGenerationCancellation(new ImagePipelineError("ABORTED", "raw")),
    ).toBe(true);
    expect(
      isGenerationCancellation(
        new QuantizationWorkerError("SUPERSEDED", "raw"),
      ),
    ).toBe(true);
    expect(isGenerationCancellation(new Error("raw"))).toBe(false);
  });
});
