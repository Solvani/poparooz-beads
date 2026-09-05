import type { EmailGateChallengeState } from "../model";
import type { D1DatabasePort } from "../runtime-ports";

export interface MarketingConsentAuthorityRow {
  readonly challengeId: string;
  readonly normalizedEmail: string;
  readonly state: EmailGateChallengeState;
  readonly createdAt: number;
  readonly verifiedAt: number | null;
}

export interface MarketingConsentAuthorityRepository {
  findChallengeAuthority(
    challengeId: string,
  ): Promise<MarketingConsentAuthorityRow | null>;
}

export function createMarketingConsentAuthorityRepository(
  db: D1DatabasePort,
): MarketingConsentAuthorityRepository {
  return Object.freeze({
    async findChallengeAuthority(
      challengeId: string,
    ): Promise<MarketingConsentAuthorityRow | null> {
      const row = await db
        .prepare(
          `SELECT challenge_id AS challengeId,
                  normalized_email AS normalizedEmail,
                  state,
                  created_at AS createdAt,
                  verified_at AS verifiedAt
           FROM email_gate_challenges
           WHERE challenge_id = ?
           LIMIT 1`,
        )
        .bind(challengeId)
        .first<MarketingConsentAuthorityRow>();
      return row === null ? null : Object.freeze(row);
    },
  });
}
