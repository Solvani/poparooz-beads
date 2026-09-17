import type { GenerationBoardProfileSnapshot } from "../../runtime/generation-board-profile/generation-board-profile.types";
import type { GenerationColorSetSnapshot } from "../../runtime/generation-color-set/generation-color-set.types";
import type { GenerationPaletteSnapshot } from "../../runtime/generation-palette/generation-palette.types";
import type { ProcessingPolicySnapshot } from "../../runtime/processing-policy/processing-policy.types";
import { fail } from "./pattern-costing-error";
import type {
  PatternCostingRuntimeAuthority,
  Sha256Digest,
} from "./pattern-costing.types";

const COLOR_REGISTRY_DIGEST =
  "sha256:1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4" as const;
const PROFILE_DIGESTS = Object.freeze({
  "poparooz-set-24":
    "sha256:ac97b53db5b7b9baab9ad37a156557e8f7edd911c6e3fe938000b8495f7f59c5",
  "poparooz-set-48":
    "sha256:d5d082e467a9113a2a702d0b5d00fe1e248c7e016c1edb6f87323c9b381879c1",
  "poparooz-set-72":
    "sha256:e76f71ffa76069dee6742a761ab8f49450bcf3c7e60bb762c7f5b494861a63eb",
  "poparooz-set-120":
    "sha256:415f53de6840ee9e083da336199e944ac8c009e3aa44bb7370e8388f1f23deb5",
  "poparooz-set-168":
    "sha256:3137b4e30aed1132f8cbc0e06eb4d76a34f0a5da98dd806c56346493317275e7",
  "poparooz-set-221":
    "sha256:8097d031ba046eea3a3cc53ac373ce175a88a47060331ad0570835de14cb373f",
} satisfies Record<string, Sha256Digest>);

export function createPatternCostingRuntimeAuthorities(input: {
  readonly palette: GenerationPaletteSnapshot;
  readonly colorSets: GenerationColorSetSnapshot;
  readonly boardProfile: GenerationBoardProfileSnapshot;
  readonly processingPolicy: ProcessingPolicySnapshot;
}): readonly PatternCostingRuntimeAuthority[] {
  if (
    input.palette.identity.paletteId !== "poparooz-standard" ||
    input.palette.identity.paletteVersion !== "1.0.0" ||
    input.palette.recordCount !== 221 ||
    input.boardProfile.id !== "poparooz-board-104" ||
    input.boardProfile.version !== "1.0.0"
  )
    fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
  if (
    input.processingPolicy.policyId !== "poparooz-processing-policy" ||
    input.processingPolicy.policyVersion !== "1.1.0"
  )
    fail("QUARANTINE_PROCESSING_POLICY_IDENTITY_MISMATCH");
  const paletteCodes = new Set(input.palette.colors.map((color) => color.code));
  if (paletteCodes.size !== 221) fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
  return Object.freeze(
    input.colorSets.profiles.map((profile) => {
      const digest = PROFILE_DIGESTS[profile.profileId];
      if (
        digest === undefined ||
        profile.memberCodes.length !== profile.size ||
        new Set(profile.memberCodes).size !== profile.size ||
        profile.memberCodes.some((code) => !paletteCodes.has(code))
      )
        fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
      return Object.freeze({
        colorRegistryId: "poparooz-standard" as const,
        colorRegistryVersion: "1.0.0" as const,
        colorRegistryDigest: COLOR_REGISTRY_DIGEST,
        generationColorSetProfileId: profile.profileId,
        generationColorSetProfileSize: profile.size,
        generationColorSetProfileDigest: digest,
        generationColorSetMemberCodes: Object.freeze([...profile.memberCodes]),
        boardProfileId: "poparooz-board-104" as const,
        boardProfileVersion: "1.0.0" as const,
        processingPolicyId: "poparooz-processing-policy" as const,
        processingPolicyVersion: "1.1.0" as const,
      });
    }),
  );
}

export function assertPatternCostingRuntimeAuthority(
  input: unknown,
): asserts input is PatternCostingRuntimeAuthority {
  if (
    typeof input !== "object" ||
    input === null ||
    !("generationColorSetProfileId" in input)
  )
    fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
  const authority = input as PatternCostingRuntimeAuthority;
  if (
    authority.colorRegistryId !== "poparooz-standard" ||
    authority.colorRegistryVersion !== "1.0.0" ||
    authority.colorRegistryDigest !== COLOR_REGISTRY_DIGEST ||
    authority.generationColorSetProfileDigest !==
      PROFILE_DIGESTS[authority.generationColorSetProfileId] ||
    authority.generationColorSetMemberCodes.length !==
      authority.generationColorSetProfileSize ||
    new Set(authority.generationColorSetMemberCodes).size !==
      authority.generationColorSetProfileSize ||
    authority.boardProfileId !== "poparooz-board-104" ||
    authority.boardProfileVersion !== "1.0.0" ||
    authority.processingPolicyId !== "poparooz-processing-policy" ||
    authority.processingPolicyVersion !== "1.1.0"
  )
    fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
}
