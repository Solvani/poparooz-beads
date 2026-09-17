import { describe, expect, it } from "vitest";

import { canonicalJson, domainSeparatedDigest } from "./canonical-json";
import { bindControlledGenerationManifest } from "./manifest";
import { PatternCostingError } from "./pattern-costing-error";
import { createPatternCostingExportV21 } from "./pattern-costing-export";
import { validateAndCanonicalizePattern } from "./pattern-canonicalization";
import {
  ASSERTION_ID,
  IMPLEMENTATION_AUTHORITY,
  MANIFEST,
  RUNTIME_AUTHORITY,
  allA1Pattern,
  manifestBytes,
  successState,
} from "./test-fixtures";

async function authority() {
  return bindControlledGenerationManifest(manifestBytes(), {
    assertionId: ASSERTION_ID,
    acceptedGeneratorImplementationAuthorityId: IMPLEMENTATION_AUTHORITY,
  });
}

describe("PatternCostingExportV2.1", () => {
  it("matches the frozen manifest, pattern, final snapshot and payload vectors", async () => {
    const bound = await authority();
    expect(bound.manifestDigest).toBe(
      "sha256:0f29e8d10df6f99d337636d84219bb9cb8f3727bf5b5891a2b13eb71cbe19477",
    );
    const integrity = await validateAndCanonicalizePattern(
      allA1Pattern(),
      RUNTIME_AUTHORITY,
    );
    expect(integrity.canonicalBytes).toHaveLength(8038);
    expect(integrity.patternHash).toBe(
      "sha256:88415921b5520d84e80aa7bb8a5eac6d9d0b650630690c6848dec57b40b3c658",
    );
    const artifact = await createPatternCostingExportV21(successState(bound), {
      exportId: "018f3b71-6f14-7d42-9e8a-3b2e179a8c13",
      exportedAt: "2026-09-11T00:02:00Z",
    });
    expect(artifact.payload.snapshot.finalSnapshotDigest).toBe(
      "sha256:c81f9958e55887d7ff811b4c0937879bfd3f8db8094e3b546c5d5b65fdc2e10d",
    );
    expect(artifact.payload.payloadChecksum).toBe(
      "sha256:dacfb118dc7dfb5fd1ec625bd5524153fa9f8e11f74b3046a2c25f6e8b9f06b8",
    );
    expect(artifact.serialized).toBe(canonicalJson(artifact.payload));
    expect(artifact.blob.type).toBe("application/json;charset=utf-8");
  });

  it("reconciles the historical 1599 A1 plus final A2 vector", async () => {
    const pattern = allA1Pattern();
    pattern.matrix.colorIndices[1599] = 1;
    const changed = {
      ...pattern,
      colors: [
        { ...pattern.colors[0]!, beadCount: 1599 },
        {
          index: 1,
          color: { brand: "Poparooz" as const, code: "A2", hex: "#000000" },
          beadCount: 1,
        },
      ],
      materials: [
        { ...pattern.materials[0]!, beadCount: 1599 },
        {
          patternColorIndex: 1,
          color: { brand: "Poparooz" as const, code: "A2", hex: "#000000" },
          beadCount: 1,
        },
      ],
      totals: { ...pattern.totals, colorCount: 2 },
    };
    const runtime = {
      ...RUNTIME_AUTHORITY,
      generationColorSetMemberCodes: Object.freeze([
        "A1",
        "A2",
        ...RUNTIME_AUTHORITY.generationColorSetMemberCodes.slice(2),
      ]),
    };
    const integrity = await validateAndCanonicalizePattern(changed, runtime);
    expect(integrity.patternHash).toBe(
      "sha256:fa0ee0feb04c5e62a3bf31d021650ddaa695511c85d07de97b19c6acde937ad4",
    );
  });

  it("rejects closed-schema extensions and implementation authority mismatch", async () => {
    await expect(
      bindControlledGenerationManifest(
        manifestBytes({ ...MANIFEST, unexpected: true }),
        {
          assertionId: ASSERTION_ID,
          acceptedGeneratorImplementationAuthorityId: IMPLEMENTATION_AUTHORITY,
        },
      ),
    ).rejects.toMatchObject({ code: "QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION" });
    await expect(
      bindControlledGenerationManifest(manifestBytes(), {
        assertionId: ASSERTION_ID,
        acceptedGeneratorImplementationAuthorityId:
          "git:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    ).rejects.toMatchObject({
      code: "QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MISMATCH",
    });
    await expect(
      bindControlledGenerationManifest(manifestBytes(), {
        assertionId: ASSERTION_ID,
        acceptedGeneratorImplementationAuthorityId: "git:SHORT",
      }),
    ).rejects.toMatchObject({
      code: "QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MALFORMED",
    });
  });

  it("rejects unknown, superseded and multiply targeted manifest authority", async () => {
    await expect(
      bindControlledGenerationManifest(manifestBytes(), {
        assertionId: "018f3b71-6f14-7d42-9e8a-3b2e179a8c99",
        acceptedGeneratorImplementationAuthorityId: IMPLEMENTATION_AUTHORITY,
      }),
    ).rejects.toMatchObject({ code: "QUARANTINE_PRODUCT_RESOLUTION_FAILURE" });
    const superseded = {
      ...MANIFEST,
      entries: [{ ...MANIFEST.entries[0]!, entryState: "SUPERSEDED" }],
    };
    await expect(
      bindControlledGenerationManifest(manifestBytes(superseded), {
        assertionId: ASSERTION_ID,
        acceptedGeneratorImplementationAuthorityId: IMPLEMENTATION_AUTHORITY,
      }),
    ).rejects.toMatchObject({ code: "QUARANTINE_PRODUCT_RESOLUTION_FAILURE" });
    const duplicateTarget = {
      ...MANIFEST,
      entries: [
        MANIFEST.entries[0]!,
        {
          ...MANIFEST.entries[0]!,
          assertionId: "018f3b71-6f14-7d42-9e8a-3b2e179a8c21",
          generationAttemptId: "018f3b71-6f14-7d42-9e8a-3b2e179a8c22",
        },
      ],
    };
    await expect(
      bindControlledGenerationManifest(manifestBytes(duplicateTarget), {
        assertionId: ASSERTION_ID,
        acceptedGeneratorImplementationAuthorityId: IMPLEMENTATION_AUTHORITY,
      }),
    ).rejects.toMatchObject({
      code: "QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION",
    });
  });

  it("rejects stale lifecycle and material/count mismatches", async () => {
    const bound = await authority();
    await expect(
      createPatternCostingExportV21({
        ...successState(bound),
        status: "dirty",
      } as never),
    ).rejects.toMatchObject({
      code: "QUARANTINE_GENERATION_ATTEMPT_NOT_CURRENT_SUCCESS",
    });
    const pattern = allA1Pattern();
    const mismatched = {
      ...pattern,
      materials: [{ ...pattern.materials[0]!, beadCount: 1599 }],
    };
    await expect(
      createPatternCostingExportV21(successState(bound, mismatched)),
    ).rejects.toMatchObject({ code: "QUARANTINE_COUNT_SEMANTICS_INVALID" });
    const duplicateColor = allA1Pattern();
    await expect(
      createPatternCostingExportV21(
        successState(bound, {
          ...duplicateColor,
          colors: [
            duplicateColor.colors[0]!,
            { ...duplicateColor.colors[0]!, index: 1, beadCount: 0 },
          ],
          materials: [
            duplicateColor.materials[0]!,
            {
              ...duplicateColor.materials[0]!,
              patternColorIndex: 1,
              beadCount: 0,
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "QUARANTINE_COUNT_SEMANTICS_INVALID" });
    const badBoard = allA1Pattern();
    await expect(
      createPatternCostingExportV21(
        successState(bound, {
          ...badBoard,
          boardLayout: { ...badBoard.boardLayout, usedBeadCount: 1599 },
        }),
      ),
    ).rejects.toMatchObject({ code: "QUARANTINE_RUNTIME_AUTHORITY_MISMATCH" });
  });

  it("orders per-color rows by exact UTF-8 bytes", async () => {
    const pattern = allA1Pattern();
    pattern.matrix.colorIndices.fill(0, 0, 800);
    pattern.matrix.colorIndices.fill(1, 800);
    const twoColor = {
      ...pattern,
      colors: [
        {
          index: 0,
          color: { brand: "Poparooz" as const, code: "A2", hex: "#FFFFFF" },
          beadCount: 800,
        },
        {
          index: 1,
          color: { brand: "Poparooz" as const, code: "A10", hex: "#000000" },
          beadCount: 800,
        },
      ],
      materials: [
        {
          patternColorIndex: 0,
          color: { brand: "Poparooz" as const, code: "A2", hex: "#FFFFFF" },
          beadCount: 800,
        },
        {
          patternColorIndex: 1,
          color: { brand: "Poparooz" as const, code: "A10", hex: "#000000" },
          beadCount: 800,
        },
      ],
      totals: { ...pattern.totals, colorCount: 2 },
    };
    const runtime = {
      ...RUNTIME_AUTHORITY,
      generationColorSetMemberCodes: Object.freeze([
        "A2",
        "A10",
        ...RUNTIME_AUTHORITY.generationColorSetMemberCodes.slice(2),
      ]),
    };
    const integrity = await validateAndCanonicalizePattern(twoColor, runtime);
    expect(integrity.perColorBeadCounts.map(({ colorId }) => colorId)).toEqual([
      "A10",
      "A2",
    ]);
  });

  it("rejects runtime palette, color-set, board and processing authority drift", async () => {
    const bound = await authority();
    for (const runtimeAuthority of [
      { ...RUNTIME_AUTHORITY, colorRegistryDigest: "sha256:" + "0".repeat(64) },
      { ...RUNTIME_AUTHORITY, generationColorSetProfileSize: 168 },
      { ...RUNTIME_AUTHORITY, boardProfileVersion: "2.0.0" },
      { ...RUNTIME_AUTHORITY, processingPolicyVersion: "1.2.0" },
    ]) {
      const state = successState(bound);
      const changed = {
        ...state,
        lastSuccess: {
          ...state.lastSuccess,
          snapshot: {
            ...state.lastSuccess.snapshot,
            patternCosting: {
              ...state.lastSuccess.snapshot.patternCosting!,
              runtimeAuthority,
            },
          },
        },
      };
      await expect(
        createPatternCostingExportV21(changed as never),
      ).rejects.toBeInstanceOf(PatternCostingError);
    }
  });

  it("uses RFC 8785 ordering and rejects non-finite values", async () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(
      canonicalJson({
        "1": "One",
        "€": "Euro",
        "\r": "Carriage Return",
        "😀": "Emoji",
        ö: "Latin",
      }),
    ).toBe(
      '{"\\r":"Carriage Return","1":"One","ö":"Latin","€":"Euro","😀":"Emoji"}',
    );
    expect(() => canonicalJson({ value: Number.NaN })).toThrow(
      PatternCostingError,
    );
    expect(await domainSeparatedDigest("domain", { b: 2, a: 1 })).toBe(
      await domainSeparatedDigest("domain", { a: 1, b: 2 }),
    );
  });

  it("does not serialize Pattern, image, preview, PNG or internal palette data", async () => {
    const artifact = await createPatternCostingExportV21(
      successState(await authority()),
    );
    for (const prohibited of [
      "colorIndices",
      "patternRows",
      "sourceImage",
      "normalizedSourceImageHash",
      "previewUrl",
      "png",
      "rgb",
      "lab",
    ]) {
      expect(artifact.serialized).not.toContain(prohibited);
    }
  });
});
