import type { EmailGateUnlockStore } from "./local-unlock";

export type EmailGateCompletion =
  | Readonly<{ outcome: "downloaded" }>
  | Readonly<{ outcome: "persistence-warning" }>
  | Readonly<{ outcome: "pattern-replaced" }>
  | Readonly<{ outcome: "download-failed" }>;

export interface EmailGateDownloadCoordinator<Identity> {
  begin(
    identity: Identity,
    resume: () => Promise<Readonly<{ ok: boolean }>>,
  ): void;
  cancel(): void;
  cancelUnless(identity: Identity | null): boolean;
  complete(identity: Identity | null): Promise<EmailGateCompletion>;
}

export function createEmailGateDownloadCoordinator<Identity>(
  unlockStore: EmailGateUnlockStore,
): EmailGateDownloadCoordinator<Identity> {
  let pending: {
    readonly identity: Identity;
    readonly resume: () => Promise<Readonly<{ ok: boolean }>>;
    consumed: boolean;
  } | null = null;

  return Object.freeze({
    begin(
      identity: Identity,
      resume: () => Promise<Readonly<{ ok: boolean }>>,
    ) {
      pending = { identity, resume, consumed: false };
    },
    cancel() {
      pending = null;
    },
    cancelUnless(identity: Identity | null) {
      if (pending === null || Object.is(pending.identity, identity))
        return false;
      pending = null;
      return true;
    },
    async complete(identity: Identity | null): Promise<EmailGateCompletion> {
      const current = pending;
      if (
        current === null ||
        current.consumed ||
        !Object.is(current.identity, identity)
      ) {
        pending = null;
        return { outcome: "pattern-replaced" as const };
      }
      current.consumed = true;
      const persisted = unlockStore.writeUnlocked();
      const result = await current.resume();
      pending = null;
      if (!persisted) return { outcome: "persistence-warning" as const };
      return result.ok
        ? { outcome: "downloaded" as const }
        : { outcome: "download-failed" as const };
    },
  });
}
