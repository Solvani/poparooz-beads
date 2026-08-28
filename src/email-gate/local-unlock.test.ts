import { describe, expect, it, vi } from "vitest";

import {
  EMAIL_GATE_UNLOCK_STORAGE_KEY,
  createEmailGateUnlockStore,
  type EmailGateStorage,
} from "./local-unlock";

function storageWith(value: string | null): EmailGateStorage {
  return { getItem: vi.fn(() => value), setItem: vi.fn() };
}

describe("Email Gate local unlock marker", () => {
  it.each([
    ["missing", null],
    ["malformed", "{"],
    ["wrong version", '{"contractVersion":2,"unlocked":true}'],
    ["false", '{"contractVersion":1,"unlocked":false}'],
    [
      "unknown field",
      '{"contractVersion":1,"unlocked":true,"email":"a@example.com"}',
    ],
  ])("treats %s markers as locked", (_name, value) => {
    expect(createEmailGateUnlockStore(storageWith(value)).isUnlocked()).toBe(
      false,
    );
  });

  it("accepts only the exact current marker", () => {
    expect(
      createEmailGateUnlockStore(
        storageWith('{"contractVersion":1,"unlocked":true}'),
      ).isUnlocked(),
    ).toBe(true);
  });

  it("fails closed when storage reads throw", () => {
    const storage = storageWith(null);
    vi.mocked(storage.getItem).mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(createEmailGateUnlockStore(storage).isUnlocked()).toBe(false);
  });

  it("writes only the minimal marker", () => {
    const storage = storageWith(null);
    expect(createEmailGateUnlockStore(storage).writeUnlocked()).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      EMAIL_GATE_UNLOCK_STORAGE_KEY,
      '{"contractVersion":1,"unlocked":true}',
    );
    const stored = JSON.parse(
      vi.mocked(storage.setItem).mock.calls[0]![1],
    ) as Record<string, unknown>;
    expect(Object.keys(stored)).toEqual(["contractVersion", "unlocked"]);
  });

  it("reports a failed write without throwing", () => {
    const storage = storageWith(null);
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(createEmailGateUnlockStore(storage).writeUnlocked()).toBe(false);
  });
});
