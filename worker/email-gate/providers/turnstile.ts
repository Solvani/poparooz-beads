import { z } from "zod";

import type { FetchPort } from "../runtime-ports";
import { readBoundedProviderJson } from "./bounded-provider-json";

export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify" as const;
export const TURNSTILE_EXPECTED_HOSTNAME = "generator.poparooz.com" as const;
export const TURNSTILE_EXPECTED_ACTION = "email_gate_issue_v1" as const;
export const TURNSTILE_TIMEOUT_MS = 5_000 as const;

const turnstileResponseSchema = z
  .object({
    success: z.boolean(),
    hostname: z.string().optional(),
    action: z.string().optional(),
    "error-codes": z.array(z.string()).optional(),
  })
  .passthrough();

export interface TurnstileAdapter {
  validate(token: string): Promise<boolean>;
}

export function createTurnstileAdapter(
  secret: string,
  fetchPort: FetchPort = fetch,
): TurnstileAdapter {
  return Object.freeze({
    async validate(token: string): Promise<boolean> {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        TURNSTILE_TIMEOUT_MS,
      );
      try {
        const form = new FormData();
        form.set("secret", secret);
        form.set("response", token);
        const response = await fetchPort(TURNSTILE_SITEVERIFY_URL, {
          method: "POST",
          body: form,
          redirect: "error",
          signal: controller.signal,
        });
        if (!response.ok) return false;
        const parsed = turnstileResponseSchema.safeParse(
          await readBoundedProviderJson(response, 4_096),
        );
        return (
          parsed.success &&
          parsed.data.success &&
          parsed.data.hostname === TURNSTILE_EXPECTED_HOSTNAME &&
          parsed.data.action === TURNSTILE_EXPECTED_ACTION
        );
      } catch {
        return false;
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}
