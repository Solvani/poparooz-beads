import { describe, expect, it } from "vitest";

import { renderBlindReviewHtml } from "./generator-quality-d04-review-tool.ts";

describe("D04-A02 offline blind review tool", () => {
  it("renders a self-contained anonymous, keyboard-operable review", () => {
    const html = renderBlindReviewHtml({
      packetSetId: "test-packets",
      packetSetSha256: "a".repeat(64),
      packets: Array.from({ length: 40 }, (_, index) => ({
        packetId: `packet-${index}`,
        leftImageDataUrl: "data:image/png;base64,left",
        rightImageDataUrl: "data:image/png;base64,right",
      })),
    });

    expect(html).toContain("Which pattern looks better");
    expect(html).toContain("A clearly better");
    expect(html).toContain("Cannot judge");
    expect(html).toContain("localStorage");
    expect(html).toContain('crypto.subtle.digest("SHA-256"');
    expect(html).toContain("ArrowLeft");
    expect(html).not.toContain("profileSize");
    expect(html).not.toContain("logicalCaseId");
  });

  it("rejects an unreasonable reviewer workload", () => {
    expect(() =>
      renderBlindReviewHtml({
        packetSetId: "short",
        packetSetSha256: "b".repeat(64),
        packets: [],
      }),
    ).toThrow("40 to 80");
  });
});
