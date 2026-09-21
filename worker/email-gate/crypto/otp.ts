import {
  EMAIL_GATE_OTP_REGEX,
  EMAIL_GATE_V2_OTP_REGEX,
} from "../../../src/contracts/email-gate/email-gate-contract";
import {
  EMAIL_GATE_DELIVERY_PAYLOAD_VERSION,
  EMAIL_GATE_DELIVERY_PAYLOAD_VERSION_V2,
} from "../model";

export const OTP_ALGORITHM_IDENTIFIER = "POPAROOZ_EMAIL_GATE_OTP_V1" as const;
export const OTP_DOMAIN_SEPARATOR = "poparooz-email-gate:otp:v1" as const;
export const OTP_REJECTION_THRESHOLD = 4_200_000_000 as const;
export const OTP_MODULUS = 100_000_000 as const;
export const OTP_MAX_COUNTER = 15 as const;
export const OTP_V2_ALGORITHM_IDENTIFIER =
  "POPAROOZ_EMAIL_GATE_OTP_V2" as const;
export const OTP_V2_DOMAIN_SEPARATOR = "poparooz-email-gate:otp:v2" as const;
export const OTP_V2_REJECTION_THRESHOLD = 4_294_000_000 as const;
export const OTP_V2_MODULUS = 1_000_000 as const;

const textEncoder = new TextEncoder();

export class OtpDerivationError extends Error {
  constructor() {
    super("OTP derivation failed.");
    this.name = "OtpDerivationError";
  }
}

export interface OtpKeyRegistry {
  readonly activeVersion: number;
  getKey(version: number): Promise<CryptoKey | null>;
}

export type HmacSigner = (
  key: CryptoKey,
  message: Uint8Array<ArrayBuffer>,
) => Promise<ArrayBuffer>;

export function createOtpKeyRegistry(
  activeVersion: number,
  keyBytesByVersion: ReadonlyMap<number, Uint8Array>,
): OtpKeyRegistry {
  return Object.freeze({
    activeVersion,
    async getKey(version: number): Promise<CryptoKey | null> {
      const bytes = keyBytesByVersion.get(version);
      if (bytes === undefined) return null;
      const keyData = new Uint8Array(bytes.byteLength);
      keyData.set(bytes);
      return crypto.subtle.importKey(
        "raw",
        keyData.buffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
    },
  });
}

export function decodeHexKey(hex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) return null;
  return Uint8Array.from(
    hex.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [],
  );
}

export async function deriveOtpV1(
  key: CryptoKey,
  challengeId: string,
  sign: HmacSigner = async (signingKey, message) =>
    crypto.subtle.sign("HMAC", signingKey, message),
): Promise<string> {
  const prefix = textEncoder.encode(
    `${OTP_DOMAIN_SEPARATOR}\0${challengeId}\0`,
  );

  for (let counter = 0; counter <= OTP_MAX_COUNTER; counter += 1) {
    const message = new Uint8Array(prefix.length + 4);
    message.set(prefix);
    new DataView(message.buffer).setUint32(prefix.length, counter, false);
    const digest = new Uint8Array(await sign(key, message));
    const candidate = new DataView(
      digest.buffer,
      digest.byteOffset,
      digest.byteLength,
    ).getUint32(0, false);
    if (candidate >= OTP_REJECTION_THRESHOLD) continue;
    return (candidate % OTP_MODULUS).toString().padStart(8, "0");
  }

  throw new OtpDerivationError();
}

export async function deriveOtpV2(
  key: CryptoKey,
  challengeId: string,
  sign: HmacSigner = async (signingKey, message) =>
    crypto.subtle.sign("HMAC", signingKey, message),
): Promise<string> {
  const prefix = textEncoder.encode(
    `${OTP_V2_DOMAIN_SEPARATOR}\0${challengeId}\0`,
  );

  for (let counter = 0; counter <= OTP_MAX_COUNTER; counter += 1) {
    const message = new Uint8Array(prefix.length + 4);
    message.set(prefix);
    new DataView(message.buffer).setUint32(prefix.length, counter, false);
    const digest = new Uint8Array(await sign(key, message));
    const candidate = new DataView(
      digest.buffer,
      digest.byteOffset,
      digest.byteLength,
    ).getUint32(0, false);
    if (candidate >= OTP_V2_REJECTION_THRESHOLD) continue;
    return (candidate % OTP_V2_MODULUS).toString().padStart(6, "0");
  }

  throw new OtpDerivationError();
}

export function deriveOtpForDeliveryVersion(
  version: number,
  key: CryptoKey,
  challengeId: string,
): Promise<string> {
  if (version === EMAIL_GATE_DELIVERY_PAYLOAD_VERSION) {
    return deriveOtpV1(key, challengeId);
  }
  if (version === EMAIL_GATE_DELIVERY_PAYLOAD_VERSION_V2) {
    return deriveOtpV2(key, challengeId);
  }
  throw new OtpDerivationError();
}

export function timingSafeOtpEqual(
  submittedCode: string,
  expectedCode: string,
): boolean {
  if (
    !EMAIL_GATE_OTP_REGEX.test(submittedCode) ||
    !EMAIL_GATE_OTP_REGEX.test(expectedCode)
  ) {
    return false;
  }
  return crypto.subtle.timingSafeEqual(
    textEncoder.encode(submittedCode),
    textEncoder.encode(expectedCode),
  );
}

export function timingSafeOtpEqualV2(
  submittedCode: string,
  expectedCode: string,
): boolean {
  if (
    !EMAIL_GATE_V2_OTP_REGEX.test(submittedCode) ||
    !EMAIL_GATE_V2_OTP_REGEX.test(expectedCode)
  ) {
    return false;
  }
  return crypto.subtle.timingSafeEqual(
    textEncoder.encode(submittedCode),
    textEncoder.encode(expectedCode),
  );
}

export function timingSafeOtpEqualForDeliveryVersion(
  version: number,
  submittedCode: string,
  expectedCode: string,
): boolean {
  if (version === EMAIL_GATE_DELIVERY_PAYLOAD_VERSION) {
    return timingSafeOtpEqual(submittedCode, expectedCode);
  }
  if (version === EMAIL_GATE_DELIVERY_PAYLOAD_VERSION_V2) {
    return timingSafeOtpEqualV2(submittedCode, expectedCode);
  }
  return false;
}
