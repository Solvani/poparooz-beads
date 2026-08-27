import {
  normalizeEmailAddressV1,
  type EmailGateChallengeRequest,
  type EmailGateVerificationRequest,
} from "../../../src/contracts/email-gate/email-gate-contract";
import type { DeliveryPayloadRendererRegistry } from "../delivery/payload-renderer";
import {
  deriveOtpV1,
  type OtpKeyRegistry,
  timingSafeOtpEqual,
} from "../crypto/otp";
import {
  EMAIL_GATE_CHALLENGE_TTL_MS,
  EMAIL_GATE_COOLDOWN_MS,
  EMAIL_GATE_PROVIDER_LEASE_MS,
  remainingSeconds,
  type VerificationResult,
} from "../model";
import type { ResendAdapter } from "../providers/resend";
import type { TurnstileAdapter } from "../providers/turnstile";
import type { EmailGateRepository } from "../repository/email-gate-repository";

export interface IssueChallengeResult {
  readonly result:
    | "challenge_issued"
    | "invalid_request"
    | "retry_later"
    | "service_unavailable";
  readonly challengeId?: string;
  readonly expiresInSeconds?: number;
  readonly resendAfterSeconds?: number;
}

export interface EmailGateService {
  issue(request: EmailGateChallengeRequest): Promise<IssueChallengeResult>;
  verify(request: EmailGateVerificationRequest): Promise<VerificationResult>;
  scheduled(): Promise<number>;
}

export interface EmailGateServiceDependencies {
  readonly repository: EmailGateRepository;
  readonly turnstile: TurnstileAdapter;
  readonly resend: ResendAdapter;
  readonly otpKeys: OtpKeyRegistry;
  readonly payloadRenderers: DeliveryPayloadRendererRegistry;
  readonly now: () => number;
  readonly randomUuid: () => string;
}

export function createEmailGateService(
  dependencies: EmailGateServiceDependencies,
): EmailGateService {
  const {
    repository,
    turnstile,
    resend,
    otpKeys,
    payloadRenderers,
    now,
    randomUuid,
  } = dependencies;

  return Object.freeze({
    async issue(
      request: EmailGateChallengeRequest,
    ): Promise<IssueChallengeResult> {
      const normalized = normalizeEmailAddressV1(request.email);
      if (!normalized.ok) return Object.freeze({ result: "invalid_request" });
      if (!(await turnstile.validate(request.turnstileToken))) {
        return Object.freeze({ result: "retry_later" });
      }

      const decisionNow = now();
      await repository.settleIneligiblePending(
        normalized.normalizedEmail,
        decisionNow,
      );
      let challenge = await repository.findPendingByEmail(
        normalized.normalizedEmail,
      );

      if (challenge === null) {
        const challengeId = randomUuid();
        const providerSendEventId = randomUuid();
        challenge = await repository.createNewPending({
          challengeId,
          normalizedEmail: normalized.normalizedEmail,
          otpKeyVersion: otpKeys.activeVersion,
          providerSendEventId,
          deliveryPayloadVersion: payloadRenderers.activeVersion,
          createdAt: decisionNow,
          expiresAt: decisionNow + EMAIL_GATE_CHALLENGE_TTL_MS,
        });
        if (challenge === null) {
          return Object.freeze({ result: "retry_later" });
        }
      }

      const attemptNow = now();
      const reserved = await repository.reserveProviderAttempt(
        challenge.challengeId,
        attemptNow,
        attemptNow + EMAIL_GATE_PROVIDER_LEASE_MS,
      );
      if (reserved === null) {
        await repository.settleIneligiblePending(
          normalized.normalizedEmail,
          attemptNow,
        );
        return Object.freeze({ result: "retry_later" });
      }

      const key = await otpKeys.getKey(reserved.otpKeyVersion);
      const renderer = payloadRenderers.getRenderer(
        reserved.deliveryPayloadVersion,
      );
      if (key === null || renderer === null) {
        return Object.freeze({ result: "service_unavailable" });
      }

      let otp: string;
      try {
        otp = await deriveOtpV1(key, reserved.challengeId);
      } catch {
        return Object.freeze({ result: "service_unavailable" });
      }
      const payload = renderer.render({
        normalizedEmail: reserved.normalizedEmail,
        otp,
      });
      const providerResult = await resend.send(
        reserved.providerSendEventId,
        payload,
      );
      const responseNow = now();

      // Expiry remains authoritative over every provider outcome. This is a
      // conditional D1 transition, so a delayed response cannot revive or
      // terminally misclassify an event whose lifetime elapsed in flight.
      if (await repository.expireChallenge(reserved.challengeId, responseNow)) {
        return Object.freeze({ result: "service_unavailable" });
      }

      if (providerResult.outcome === "accepted") {
        const activated = await repository.activatePending(
          reserved.challengeId,
          reserved.normalizedEmail,
          responseNow,
        );
        if (!activated || reserved.expiresAt <= responseNow) {
          await repository.expireChallenge(reserved.challengeId, responseNow);
          return Object.freeze({ result: "service_unavailable" });
        }
        return Object.freeze({
          result: "challenge_issued",
          challengeId: reserved.challengeId,
          expiresInSeconds: Math.max(
            1,
            remainingSeconds(reserved.expiresAt, responseNow),
          ),
          resendAfterSeconds: remainingSeconds(
            reserved.createdAt + EMAIL_GATE_COOLDOWN_MS,
            responseNow,
          ),
        });
      }

      if (
        providerResult.outcome === "definite_reject" ||
        providerResult.outcome === "changed_payload_conflict" ||
        reserved.providerAttemptCount >= 3
      ) {
        const failed = await repository.markDeliveryFailed(
          reserved.challengeId,
          responseNow,
        );
        if (!failed) {
          await repository.expireChallenge(reserved.challengeId, responseNow);
        }
        return Object.freeze({ result: "service_unavailable" });
      }
      return Object.freeze({ result: "retry_later" });
    },

    async verify(
      request: EmailGateVerificationRequest,
    ): Promise<VerificationResult> {
      const lookupNow = now();
      let challenge = await repository.findChallenge(request.challengeId);
      if (challenge === null) return "verification_invalid";
      if (challenge.expiresAt <= lookupNow || challenge.state === "expired") {
        await repository.expireChallenge(challenge.challengeId, lookupNow);
        return "verification_expired";
      }
      if (challenge.state === "terminal_failed") return "verification_locked";
      if (challenge.state !== "active") return "verification_invalid";

      const key = await otpKeys.getKey(challenge.otpKeyVersion);
      if (key === null) return "service_unavailable";
      let expectedOtp: string;
      try {
        expectedOtp = await deriveOtpV1(key, challenge.challengeId);
      } catch {
        return "service_unavailable";
      }

      const mutationNow = now();
      if (challenge.expiresAt <= mutationNow) {
        await repository.expireChallenge(challenge.challengeId, mutationNow);
        return "verification_expired";
      }

      const correct = timingSafeOtpEqual(request.code, expectedOtp);
      if (correct) {
        if (
          await repository.verifyActive(
            challenge.challengeId,
            challenge.rowVersion,
            mutationNow,
          )
        ) {
          return "verification_succeeded";
        }
      } else {
        const updated = await repository.recordWrongAttempt(
          challenge.challengeId,
          challenge.rowVersion,
          challenge.attemptCount,
          mutationNow,
        );
        if (updated !== null) {
          return updated.state === "terminal_failed"
            ? "verification_locked"
            : "verification_invalid";
        }
      }

      challenge = await repository.findChallenge(challenge.challengeId);
      const rereadNow = now();
      return mapLostRace(challenge, rereadNow);
    },

    async scheduled(): Promise<number> {
      return repository.reconcileAndCleanup(now(), 25);
    },
  });
}

function mapLostRace(
  challenge: Awaited<ReturnType<EmailGateRepository["findChallenge"]>>,
  now: number,
): VerificationResult {
  if (
    challenge !== null &&
    (challenge.state === "expired" || challenge.expiresAt <= now)
  ) {
    return "verification_expired";
  }
  if (challenge?.state === "terminal_failed") return "verification_locked";
  if (challenge === null || challenge.state !== "active") {
    return "verification_invalid";
  }
  return "retry_later";
}
