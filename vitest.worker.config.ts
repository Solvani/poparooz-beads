import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    path.join(import.meta.dirname, "worker/email-gate/migrations"),
  );

  return {
    plugins: [
      cloudflareTest({
        main: "./worker/email-gate/index.ts",
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          d1Databases: { EMAIL_GATE_DB: "email-gate-test" },
          bindings: {
            TEST_MIGRATIONS: migrations,
            RESEND_API_KEY: "test-only-resend-key",
            TURNSTILE_SECRET: "test-only-turnstile-secret",
            OTP_DERIVATION_KEY: "test-only-otp-key",
          },
        },
      }),
    ],
    test: {
      include: ["worker/email-gate/tests/**/*.worker.ts"],
      setupFiles: ["./worker/email-gate/tests/apply-migrations.ts"],
      testTimeout: 15_000,
    },
  };
});
