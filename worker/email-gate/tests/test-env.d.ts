import type { D1Migration } from "@cloudflare/vitest-plugin";

import type { D1DatabasePort } from "../runtime-ports";

declare global {
  namespace Cloudflare {
    interface Env {
      EMAIL_GATE_DB: D1DatabasePort;
      TEST_MIGRATIONS: D1Migration[];
      RESEND_API_KEY: string;
      TURNSTILE_SECRET: string;
      OTP_DERIVATION_KEY: string;
    }
  }
}

export {};
