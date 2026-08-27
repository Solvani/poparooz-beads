import { z } from "zod";

import type { DeliveryPayload } from "../delivery/payload-renderer";
import type { ProviderSendResult } from "../model";
import type { FetchPort } from "../runtime-ports";
import { readBoundedProviderJson } from "./bounded-provider-json";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails" as const;
export const RESEND_TIMEOUT_MS = 8_000 as const;

const resendAcceptedSchema = z.object({ id: z.string().min(1) }).passthrough();
const resendErrorSchema = z
  .object({ name: z.string(), message: z.string().optional() })
  .passthrough();

export interface ResendAdapter {
  send(
    providerSendEventId: string,
    payload: DeliveryPayload,
  ): Promise<ProviderSendResult>;
}

export function createResendAdapter(
  apiKey: string,
  fetchPort: FetchPort = fetch,
): ResendAdapter {
  return Object.freeze({
    async send(
      providerSendEventId: string,
      payload: DeliveryPayload,
    ): Promise<ProviderSendResult> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
      try {
        const requestBody =
          payload.html === undefined
            ? {
                from: payload.from,
                to: payload.to,
                subject: payload.subject,
                text: payload.text,
                reply_to: payload.replyTo,
              }
            : {
                from: payload.from,
                to: payload.to,
                subject: payload.subject,
                text: payload.text,
                html: payload.html,
                reply_to: payload.replyTo,
              };
        const response = await fetchPort(RESEND_EMAILS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `poparooz-email-gate/v1/${providerSendEventId}`,
          },
          body: JSON.stringify(requestBody),
          redirect: "error",
          signal: controller.signal,
        });

        const parsedBody = await readBoundedProviderJson(response, 4_096);
        if (response.ok && resendAcceptedSchema.safeParse(parsedBody).success) {
          return Object.freeze({ outcome: "accepted" });
        }

        const error = resendErrorSchema.safeParse(parsedBody);
        if (response.status === 409 && error.success) {
          if (error.data.name === "invalid_idempotent_request") {
            return Object.freeze({ outcome: "changed_payload_conflict" });
          }
          if (error.data.name === "concurrent_idempotent_requests") {
            return Object.freeze({
              outcome: "concurrent_idempotency_conflict",
            });
          }
        }

        if (response.status >= 400 && response.status < 500) {
          return Object.freeze({ outcome: "definite_reject" });
        }
        return Object.freeze({ outcome: "ambiguous" });
      } catch {
        return Object.freeze({ outcome: "ambiguous" });
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}
