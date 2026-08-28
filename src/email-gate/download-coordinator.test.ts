import { describe, expect, it, vi } from "vitest";

import { createEmailGateDownloadCoordinator } from "./download-coordinator";

describe("Email Gate pending download coordinator", () => {
  it("resumes the original download exactly once", async () => {
    const resume = vi.fn(async () => ({ ok: true }));
    const writeUnlocked = vi.fn(() => true);
    const coordinator = createEmailGateDownloadCoordinator({
      isUnlocked: vi.fn(() => false),
      writeUnlocked,
    });
    coordinator.begin(7, resume);
    await expect(coordinator.complete(7)).resolves.toEqual({
      outcome: "downloaded",
    });
    await expect(coordinator.complete(7)).resolves.toEqual({
      outcome: "pattern-replaced",
    });
    expect(writeUnlocked).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
  });

  it("still downloads once when persistence fails and reports the warning", async () => {
    const resume = vi.fn(async () => ({ ok: true }));
    const coordinator = createEmailGateDownloadCoordinator({
      isUnlocked: vi.fn(() => false),
      writeUnlocked: vi.fn(() => false),
    });
    coordinator.begin(9, resume);
    await expect(coordinator.complete(9)).resolves.toEqual({
      outcome: "persistence-warning",
    });
    expect(resume).toHaveBeenCalledOnce();
  });

  it("cancels when the successful Pattern identity is removed or replaced", async () => {
    const resume = vi.fn(async () => ({ ok: true }));
    const coordinator = createEmailGateDownloadCoordinator({
      isUnlocked: vi.fn(() => false),
      writeUnlocked: vi.fn(() => true),
    });
    coordinator.begin(1, resume);
    expect(coordinator.cancelUnless(2)).toBe(true);
    await expect(coordinator.complete(2)).resolves.toEqual({
      outcome: "pattern-replaced",
    });
    expect(resume).not.toHaveBeenCalled();
  });

  it("close cancels the pending intent", async () => {
    const resume = vi.fn(async () => ({ ok: true }));
    const coordinator = createEmailGateDownloadCoordinator({
      isUnlocked: vi.fn(() => false),
      writeUnlocked: vi.fn(() => true),
    });
    coordinator.begin(1, resume);
    coordinator.cancel();
    await expect(coordinator.complete(1)).resolves.toEqual({
      outcome: "pattern-replaced",
    });
    expect(resume).not.toHaveBeenCalled();
  });
});
