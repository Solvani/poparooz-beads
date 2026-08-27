import { EMAIL_GATE_DELIVERY_PAYLOAD_VERSION } from "../model";
import {
  createDeliveryPayloadRendererRegistry,
  type DeliveryPayload,
  type DeliveryPayloadRenderer,
  type DeliveryPayloadRendererRegistry,
} from "./payload-renderer";

const PRODUCTION_FROM_V1 =
  "Poparooz <verification@notify.poparooz.com>" as const;
const PRODUCTION_REPLY_TO_V1 = "poparooz2026@gmail.com" as const;
const PRODUCTION_SUBJECT_V1 = "Your Poparooz verification code" as const;

export const PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1 = Object.freeze({
  version: EMAIL_GATE_DELIVERY_PAYLOAD_VERSION,
  render({
    normalizedEmail,
    otp,
  }: Readonly<{ normalizedEmail: string; otp: string }>): DeliveryPayload {
    if (!/^[0-9]{8}$/.test(otp)) {
      throw new TypeError("Invalid production delivery OTP.");
    }

    return Object.freeze({
      from: PRODUCTION_FROM_V1,
      replyTo: PRODUCTION_REPLY_TO_V1,
      to: Object.freeze([normalizedEmail]) as readonly [string],
      subject: PRODUCTION_SUBJECT_V1,
      text: renderProductionTextV1(otp),
      html: renderProductionHtmlV1(otp),
    });
  },
}) satisfies DeliveryPayloadRenderer;

export function createProductionDeliveryPayloadRendererRegistry(): DeliveryPayloadRendererRegistry {
  return createDeliveryPayloadRendererRegistry(
    EMAIL_GATE_DELIVERY_PAYLOAD_VERSION,
    [PRODUCTION_DELIVERY_PAYLOAD_RENDERER_V1],
  );
}

function renderProductionTextV1(otp: string): string {
  return `Your Poparooz verification code is:

${otp}

Use this code in Poparooz to verify your email and continue your pattern download.

This code is valid for up to 10 minutes after it was requested.

If you didn't request this code, you can ignore this email.

Poparooz`;
}

function renderProductionHtmlV1(otp: string): string {
  return `<!doctype html>
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
<p style="margin:0 0 24px;font-size:36px;font-weight:700;letter-spacing:0.18em">${otp}</p>
<p style="margin:0 0 16px">Use this code in Poparooz to verify your email and continue your pattern download.</p>
<p style="margin:0 0 16px">This code is valid for up to 10 minutes after it was requested.</p>
<p style="margin:0 0 24px">If you didn't request this code, you can ignore this email.</p>
<p style="margin:0">Poparooz</p>
</main>
</body>
</html>`;
}
