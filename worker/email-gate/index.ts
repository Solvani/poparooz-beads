import { createEmailGateFetchHandler } from "./api";
import { createDeliveryPayloadRendererRegistry } from "./delivery/payload-renderer";
import { createOtpKeyRegistry } from "./crypto/otp";
import {
  EMAIL_GATE_DELIVERY_PAYLOAD_VERSION,
  EMAIL_GATE_OTP_KEY_VERSION,
} from "./model";
import { createResendAdapter } from "./providers/resend";
import { createTurnstileAdapter } from "./providers/turnstile";
import { createEmailGateRepository } from "./repository/email-gate-repository";
import type {
  EmailGateRuntimeBindings,
  EmailGateScheduledController,
} from "./runtime-ports";
import { createEmailGateService } from "./service/email-gate-service";

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
    // No production sender/subject/body is frozen yet. The runtime therefore
    // has no production renderer and fails closed until that decision exists.
    payloadRenderers: createDeliveryPayloadRendererRegistry(
      EMAIL_GATE_DELIVERY_PAYLOAD_VERSION,
      [],
    ),
    now: Date.now,
    randomUuid: () => crypto.randomUUID(),
  });
}

export default {
  async fetch(
    request: Request,
    env: EmailGateRuntimeBindings,
  ): Promise<Response> {
    return createEmailGateFetchHandler(createRuntimeService(env))(request);
  },

  async scheduled(
    _controller: EmailGateScheduledController,
    env: EmailGateRuntimeBindings,
  ): Promise<void> {
    await createRuntimeService(env).scheduled();
  },
};
