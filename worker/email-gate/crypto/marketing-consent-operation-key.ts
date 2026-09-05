const OPERATION_KEY_NAMESPACE = "poparooz-marketing-consent-v1" as const;
const UTF8 = new TextEncoder();

export function createGrantOperationKey(
  challengeId: string,
  consentVersion: string,
): Promise<string> {
  return sha256Hex(
    `${OPERATION_KEY_NAMESPACE}\0grant\0${challengeId}\0${consentVersion}`,
  );
}

export function createWithdrawalOperationKey(
  challengeId: string,
): Promise<string> {
  return sha256Hex(`${OPERATION_KEY_NAMESPACE}\0withdraw\0${challengeId}`);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", UTF8.encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
