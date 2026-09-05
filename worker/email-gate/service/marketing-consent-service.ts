import {
  MARKETING_CONSENT_CHALLENGE_ID_REGEX,
  type MarketingConsentGrantRequest,
  type MarketingConsentWithdrawalRequest,
} from "../../../src/contracts/marketing-consent/marketing-consent-contract";
import type { MarketingConsentAuthorityRow } from "../repository/marketing-consent-authority-repository";
import type { MarketingConsentAuthorityRepository } from "../repository/marketing-consent-authority-repository";
import type {
  MarketingConsentGrantInput,
  MarketingConsentRepository,
  MarketingConsentWithdrawalInput,
} from "../repository/marketing-consent-repository";

export const MARKETING_CONSENT_AUTHORITY_WINDOW_MS = 600_000 as const;

export type MarketingConsentGrantServiceResult =
  | "grant_persisted"
  | "already_active"
  | "verification_authority_invalid"
  | "service_unavailable";

export type MarketingConsentWithdrawalServiceResult =
  | "withdrawn"
  | "already_withdrawn"
  | "not_active"
  | "verification_authority_invalid"
  | "service_unavailable";

export interface MarketingConsentService {
  grant(
    request: MarketingConsentGrantRequest,
  ): Promise<MarketingConsentGrantServiceResult>;
  withdraw(
    request: MarketingConsentWithdrawalRequest,
  ): Promise<MarketingConsentWithdrawalServiceResult>;
}

export interface MarketingConsentServiceDependencies {
  readonly authorityRepository: MarketingConsentAuthorityRepository;
  readonly marketingRepository: MarketingConsentRepository;
  readonly now: () => number;
  readonly randomUuid: () => string;
}

export function createMarketingConsentService(
  dependencies: MarketingConsentServiceDependencies,
): MarketingConsentService {
  const { authorityRepository, marketingRepository, now, randomUuid } =
    dependencies;

  return Object.freeze({
    async grant(
      request: MarketingConsentGrantRequest,
    ): Promise<MarketingConsentGrantServiceResult> {
      try {
        const challenge = await authorityRepository.findChallengeAuthority(
          request.challengeId,
        );
        const timestamp = now();
        if (!isSafeServerTimestamp(timestamp)) return "service_unavailable";
        if (!hasValidAuthority(challenge, request.challengeId, timestamp)) {
          return "verification_authority_invalid";
        }

        const subscriptionId = randomUuid();
        const eventId = randomUuid();
        if (
          !MARKETING_CONSENT_CHALLENGE_ID_REGEX.test(subscriptionId) ||
          !MARKETING_CONSENT_CHALLENGE_ID_REGEX.test(eventId)
        ) {
          return "service_unavailable";
        }

        const input: MarketingConsentGrantInput = Object.freeze({
          canonicalEmail: challenge.normalizedEmail,
          challengeId: challenge.challengeId,
          challengeCreatedAt: challenge.createdAt,
          challengeVerifiedAt: challenge.verifiedAt,
          timestamp,
          subscriptionId,
          eventId,
        });
        return await marketingRepository.grant(input);
      } catch {
        return "service_unavailable";
      }
    },

    async withdraw(
      request: MarketingConsentWithdrawalRequest,
    ): Promise<MarketingConsentWithdrawalServiceResult> {
      try {
        const challenge = await authorityRepository.findChallengeAuthority(
          request.challengeId,
        );
        const timestamp = now();
        if (!isSafeServerTimestamp(timestamp)) return "service_unavailable";
        if (!hasValidAuthority(challenge, request.challengeId, timestamp)) {
          return "verification_authority_invalid";
        }

        const eventId = randomUuid();
        if (!MARKETING_CONSENT_CHALLENGE_ID_REGEX.test(eventId)) {
          return "service_unavailable";
        }

        const input: MarketingConsentWithdrawalInput = Object.freeze({
          canonicalEmail: challenge.normalizedEmail,
          challengeId: challenge.challengeId,
          challengeCreatedAt: challenge.createdAt,
          challengeVerifiedAt: challenge.verifiedAt,
          timestamp,
          eventId,
        });
        return await marketingRepository.withdraw(input);
      } catch {
        return "service_unavailable";
      }
    },
  });
}

function hasValidAuthority(
  challenge: MarketingConsentAuthorityRow | null,
  requestedChallengeId: string,
  timestamp: number,
): challenge is MarketingConsentAuthorityRow & { readonly verifiedAt: number } {
  return (
    challenge !== null &&
    challenge.challengeId === requestedChallengeId &&
    challenge.normalizedEmail.length > 0 &&
    challenge.state === "verified" &&
    Number.isSafeInteger(challenge.createdAt) &&
    challenge.createdAt >= 0 &&
    challenge.verifiedAt !== null &&
    Number.isSafeInteger(challenge.verifiedAt) &&
    challenge.verifiedAt >= challenge.createdAt &&
    timestamp >= challenge.verifiedAt &&
    timestamp - challenge.verifiedAt <= MARKETING_CONSENT_AUTHORITY_WINDOW_MS
  );
}

function isSafeServerTimestamp(timestamp: number): boolean {
  return Number.isSafeInteger(timestamp) && timestamp >= 0;
}
