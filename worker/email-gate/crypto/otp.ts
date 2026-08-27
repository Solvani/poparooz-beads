import { EMAIL_GATE_OTP_REGEX } from "../../../src/contracts/email-gate/email-gate-contract";

export const OTP_ALGORITHM_IDENTIFIER = "POPAROOZ_EMAIL_GATE_OTP_V1" as const;
export const OTP_DOMAIN_SEPARATOR = "poparooz-email-gate:otp:v1" as const;
export const OTP_REJECTION_THRESHOLD = 4_200_000_000 as const;
export const OTP_MODULUS = 100_000_000 as const;
export const OTP_MAX_COUNTER = 15 as const;

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
