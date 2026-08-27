import { describe, expect, it } from "vitest";

import {
  createProductionDeliveryPayloadRendererRegistry,
  PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1,
} from "../delivery/production-renderer-v1";
import { createTestFixtureRenderer } from "../delivery/payload-renderer";

const EXPECTED_TEXT = `Your Poparooz verification code is:

12345678

Use this code in Poparooz to verify your email and continue your pattern download.

This code is valid for up to 10 minutes after it was requested.

If you didn't request this code, you can ignore this email.

Poparooz`;

const EXPECTED_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your Poparooz verification code</title>
</head>
<body style="margin:0;background:#f7f3eb;color:#2b2118;font-family:Arial,sans-serif">
<main style="box-sizing:border-box;margin:0 auto;max-width:600px;padding:32px 24px">
<p style="margin:0 0 24px;font-size:20px;font-weight:700">Poparooz</p>
<h1 style="margin:0 0 24px;font-size:24px">Your Poparooz verification code is:</h1>
<p style="margin:0 0 24px;font-size:36px;font-weight:700;letter-spacing:0.18em">12345678</p>
<p style="margin:0 0 16px">Use this code in Poparooz to verify your email and continue your pattern download.</p>
<p style="margin:0 0 16px">This code is valid for up to 10 minutes after it was requested.</p>
<p style="margin:0 0 24px">If you didn't request this code, you can ignore this email.</p>
<p style="margin:0">Poparooz</p>
</main>
</body>
</html>`;

describe("Production Delivery Renderer V1", () => {
  it("renders the exact immutable V1 delivery payload", () => {
    expect(PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1.version).toBe(1);
    expect(
      PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1.render({
        normalizedEmail: "User+pattern@example.com",
        otp: "12345678",
      }),
    ).toEqual({
      from: "Poparooz <verification@notify.poparooz.com>",
      replyTo: "poparooz2026@gmail.com",
      to: ["User+pattern@example.com"],
      subject: "Your Poparooz verification code",
      text: EXPECTED_TEXT,
      html: EXPECTED_HTML,
    });
  });

  it("freezes byte-identical text and HTML serialization", () => {
    const input = Object.freeze({
      normalizedEmail: "User+pattern@example.com",
      otp: "12345678",
    });
    const first = PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1.render(input);
    const second = PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1.render(input);

    expect(first.text).toBe(EXPECTED_TEXT);
    expect(first.html).toBe(EXPECTED_HTML);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("keeps the recipient only in to and preserves the OTP text value", () => {
    const normalizedEmail = "Recipient.Privacy+v1@example.com";
    const payload = PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1.render({
      normalizedEmail,
      otp: "12345678",
    });

    expect(payload.to).toEqual([normalizedEmail]);
    expect(payload.subject).not.toContain(normalizedEmail);
    expect(payload.text).not.toContain(normalizedEmail);
    expect(payload.html).not.toContain(normalizedEmail);
    expect(payload.text).toContain("\n12345678\n");
    expect(payload.html).toContain(">12345678</p>");
    expect(payload.text).not.toContain("1234 5678");
    expect(payload.html).not.toContain("1234 5678");
  });

  it("contains no forbidden HTML content or external request surface", () => {
    const html = PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1.render({
      normalizedEmail: "a@example.com",
      otp: "12345678",
    }).html!.toLowerCase();

    for (const forbidden of [
      "<a",
      "<img",
      "http://",
      "https://",
      "javascript:",
      "<form",
      "<script",
      "@import",
      "tracking",
      "analytics",
      "unsubscribe",
    ]) {
      expect(html).not.toContain(forbidden);
    }
  });

  it.each([
    "1234567",
    "123456789",
    "1234 5678",
    "１２３４５６７８",
    "abcdefgh",
  ])("fails closed for non-canonical OTP %s", (otp) => {
    expect(() =>
      PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1.render({
        normalizedEmail: "a@example.com",
        otp,
      }),
    ).toThrow("Invalid production delivery OTP.");
  });

  it("registers only production V1 and never substitutes an unknown version", () => {
    const registry = createProductionDeliveryPayloadRendererRegistry();
    const fixture = createTestFixtureRenderer(1);

    expect(registry.activeVersion).toBe(1);
    expect(registry.getRenderer(1)).toBe(
      PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1,
    );
    expect(registry.getRenderer(1)).not.toBe(fixture);
    expect(registry.getRenderer(0)).toBeNull();
    expect(registry.getRenderer(2)).toBeNull();
  });
});
