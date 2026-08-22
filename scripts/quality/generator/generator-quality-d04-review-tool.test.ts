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

  it("renders the exact targeted workload with explicit Pattern A/B copy", () => {
    const html = renderBlindReviewHtml({
      packetSetId: "targeted-packets",
      packetSetSha256: "c".repeat(64),
      exactPacketCount: 35,
      resultStage: "P3-A03-E05-D04-A02-C",
      requiredReviewerId: "reviewer-3",
      explicitPatternChoiceLabels: true,
      storageNamespace: "poparooz-d04-a02-c1",
      downloadPrefix: "poparooz-a02-c1",
      packets: Array.from({ length: 35 }, (_, index) => ({
        packetId: `private-target-${index}`,
        leftImageDataUrl: "data:image/png;base64,left",
        rightImageDataUrl: "data:image/png;base64,right",
      })),
    });

    expect(html).toContain("Pattern A clearly better");
    expect(html).toContain("Pattern B slightly better");
    expect(html).toContain('value="reviewer-3" readonly');
    expect(html).toContain("P3-A03-E05-D04-A02-C");
    expect(html).toContain(
      'Comparison "+(current+1)+" of "+tool.packets.length',
    );
  });
});
