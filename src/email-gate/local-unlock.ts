export const EMAIL_GATE_UNLOCK_STORAGE_KEY =
  "poparooz.email-download-gate.unlock.v1" as const;

const EMAIL_GATE_UNLOCK_VALUE = JSON.stringify({
  contractVersion: 1,
  unlocked: true,
});

export interface EmailGateUnlockStore {
  isUnlocked(): boolean;
  writeUnlocked(): boolean;
}

export interface EmailGateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createEmailGateUnlockStore(
  storage: EmailGateStorage,
): EmailGateUnlockStore {
  return Object.freeze({
    isUnlocked() {
      try {
        const raw = storage.getItem(EMAIL_GATE_UNLOCK_STORAGE_KEY);
        if (raw === null) return false;
        const value: unknown = JSON.parse(raw);
        if (typeof value !== "object" || value === null) return false;
        const keys = Object.keys(value);
        return (
          keys.length === 2 &&
          keys.includes("contractVersion") &&
          keys.includes("unlocked") &&
          Reflect.get(value, "contractVersion") === 1 &&
          Reflect.get(value, "unlocked") === true
        );
      } catch {
        return false;
      }
    },
    writeUnlocked() {
      try {
        storage.setItem(EMAIL_GATE_UNLOCK_STORAGE_KEY, EMAIL_GATE_UNLOCK_VALUE);
        return true;
      } catch {
        return false;
      }
    },
  });
}

export function createBrowserEmailGateUnlockStore(): EmailGateUnlockStore {
  return createEmailGateUnlockStore(window.localStorage);
}
