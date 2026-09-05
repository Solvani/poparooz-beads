import { createEmailGateFetchHandler } from "./api";
import { createProductionDeliveryPayloadRendererRegistry } from "./delivery/production-renderer-v1";
import { createOtpKeyRegistry } from "./crypto/otp";
import { createMarketingConsentFetchHandler } from "./marketing-consent/api";
import { EMAIL_GATE_OTP_KEY_VERSION } from "./model";
import { createResendAdapter } from "./providers/resend";
import { createTurnstileAdapter } from "./providers/turnstile";
import { createEmailGateRepository } from "./repository/email-gate-repository";
import { createMarketingConsentAuthorityRepository } from "./repository/marketing-consent-authority-repository";
import { createMarketingConsentRepository } from "./repository/marketing-consent-repository";
import type {
  EmailGateRuntimeBindings,
  EmailGateScheduledController,
} from "./runtime-ports";
import { createEmailGateService } from "./service/email-gate-service";
import { createMarketingConsentService } from "./service/marketing-consent-service";

function createRuntimeService(env: EmailGateRuntimeBindings) {
  const keyBytes = new TextEncoder().encode(env.OTP_DERIVATION_KEY);
  return createEmailGateService({
    repository: createEmailGateRepository(env.EMAIL_GATE_DB),
    turnstile: createTurnstileAdapter(env.TURNSTILE_SECRET),
    resend: createResendAdapter(env.RESEND_API_KEY),
    otpKeys: createOtpKeyRegistry(
      EMAIL_GATE_OTP_KEY_VERSION,
      new Map([[EMAIL_GATE_OTP_KEY_VERSION, keyBytes]]),
    ),
    payloadRenderers: createProductionDeliveryPayloadRendererRegistry(),
    now: Date.now,
    randomUuid: () => crypto.randomUUID(),
  });
}

function createRuntimeMarketingConsentService(env: EmailGateRuntimeBindings) {
  return createMarketingConsentService({
    authorityRepository: createMarketingConsentAuthorityRepository(
      env.EMAIL_GATE_DB,
    ),
    marketingRepository: createMarketingConsentRepository(env.EMAIL_GATE_DB),
    now: Date.now,
    randomUuid: () => crypto.randomUUID(),
  });
}

export default {
  async fetch(
    request: Request,
    env: EmailGateRuntimeBindings,
  ): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (
      pathname === "/api/marketing-consent" ||
      pathname.startsWith("/api/marketing-consent/")
    ) {
      return createMarketingConsentFetchHandler(
        createRuntimeMarketingConsentService(env),
      )(request);
    }
    return createEmailGateFetchHandler(createRuntimeService(env))(request);
  },

  async scheduled(
    _controller: EmailGateScheduledController,
    env: EmailGateRuntimeBindings,
  ): Promise<void> {
    await createRuntimeService(env).scheduled();
  },
};
