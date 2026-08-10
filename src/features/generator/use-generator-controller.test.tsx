import { StrictMode, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { PatternSettingsDraft } from "../settings/settings.types";
import type { GenerationRuntime, GenerationService } from "./generation.types";
import { useGeneratorController } from "./use-generator-controller";

const VALID_SETTINGS: PatternSettingsDraft = {
  width: "80",
  height: "80",
  maxColors: "16",
  background: "white",
  selectedColorSetProfileId: "poparooz-set-221",
};
const RESULT = { marker: "public" } as unknown as PublicPatternResult;

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function runtime(queue: readonly Deferred<PublicPatternResult>[]) {
  let index = 0;
  const service: GenerationService = {
    generate: vi.fn(() => queue[index++]!.promise),
  };
  const value: GenerationRuntime = {
    availability: { available: true },
    service,
    colorSetProfiles: [{ profileId: "poparooz-set-221", size: 221 }],
  };
  return { value, service };
}

describe("useGeneratorController", () => {
  it("creates a frozen input snapshot and marks a changed in-flight input dirty", async () => {
    const task = deferred<PublicPatternResult>();
    const generation = runtime([task]);
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useGeneratorController({
          file,
          imageVersion: 1,
          settings,
          runtime: generation.value,
        }),
      { initialProps: { settings: VALID_SETTINGS } },
    );
    await waitFor(() =>
      expect(result.current.state.status).toBe("image-loaded"),
    );

    act(() => expect(result.current.generate()).toBe(true));
    expect(result.current.state.status).toBe("processing");
    const [snapshot] = vi.mocked(generation.service.generate).mock.calls[0]!;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.settings)).toBe(true);

    rerender({
      settings: { ...VALID_SETTINGS, width: "40", height: "40" },
    });
    await waitFor(() => {
      if (result.current.state.status !== "processing")
        throw new Error("not processing");
      expect(result.current.state.input.candidate?.settings.width).toBe(40);
    });
    expect(snapshot.settings.width).toBe(80);

    await act(async () => task.resolve(RESULT));
    expect(result.current.state.status).toBe("dirty");
  });

  it("aborts idempotently and ignores a cancelled job's late result", async () => {
    const task = deferred<PublicPatternResult>();
    const generation = runtime([task]);
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const { result } = renderHook(() =>
      useGeneratorController({
        file,
        imageVersion: 1,
        settings: VALID_SETTINGS,
        runtime: generation.value,
      }),
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => void result.current.generate());
    const signal = vi.mocked(generation.service.generate).mock.calls[0]![1];

    act(() => expect(result.current.abort()).toBe(true));
    expect(signal.aborted).toBe(true);
    expect(result.current.state.status).toBe("aborted");
    act(() => expect(result.current.abort()).toBe(false));
    await act(async () => task.resolve(RESULT));
    expect(result.current.state.status).toBe("aborted");
  });

  it("supersedes an active job and rejects a stale success", async () => {
    const first = deferred<PublicPatternResult>();
    const second = deferred<PublicPatternResult>();
    const generation = runtime([first, second]);
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useGeneratorController({
          file,
          imageVersion: 1,
          settings,
          runtime: generation.value,
        }),
      { initialProps: { settings: VALID_SETTINGS } },
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => void result.current.generate());
    const firstSignal = vi.mocked(generation.service.generate).mock
      .calls[0]![1];

    rerender({ settings: { ...VALID_SETTINGS, maxColors: "20" } });
    await waitFor(() => {
      if (result.current.state.status !== "processing")
        throw new Error("not processing");
      expect(result.current.state.input.candidate?.settings.maxColors).toBe(20);
    });
    act(() => expect(result.current.generate()).toBe(true));
    expect(firstSignal.aborted).toBe(true);
    expect(generation.service.generate).toHaveBeenCalledTimes(2);

    await act(async () => first.resolve(RESULT));
    expect(result.current.state.status).toBe("processing");
    await act(async () => second.resolve(RESULT));
    expect(result.current.state.status).toBe("success");
  });

  it("ignores a stale error after superseding an active job", async () => {
    const first = deferred<PublicPatternResult>();
    const second = deferred<PublicPatternResult>();
    const generation = runtime([first, second]);
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const { result, rerender } = renderHook(
      ({ imageVersion }) =>
        useGeneratorController({
          file,
          imageVersion,
          settings: VALID_SETTINGS,
          runtime: generation.value,
        }),
      { initialProps: { imageVersion: 1 } },
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => void result.current.generate());
    rerender({ imageVersion: 2 });
    await waitFor(() => {
      if (result.current.state.status !== "processing")
        throw new Error("not processing");
      expect(result.current.state.input.imageVersion).toBe(2);
    });
    act(() => void result.current.generate());

    await act(async () => first.reject(new Error("stale internal error")));
    expect(result.current.state.status).toBe("processing");
    await act(async () => second.resolve(RESULT));
    expect(result.current.state.status).toBe("success");
  });

  it("marks a successful result dirty after replacing the image", async () => {
    const task = deferred<PublicPatternResult>();
    const generation = runtime([task]);
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const { result, rerender } = renderHook(
      ({ imageVersion }) =>
        useGeneratorController({
          file,
          imageVersion,
          settings: VALID_SETTINGS,
          runtime: generation.value,
        }),
      { initialProps: { imageVersion: 1 } },
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => void result.current.generate());
    await act(async () => task.resolve(RESULT));
    expect(result.current.state.status).toBe("success");

    rerender({ imageVersion: 2 });
    await waitFor(() => expect(result.current.state.status).toBe("dirty"));
  });

  it("does not start duplicate or unavailable generation", async () => {
    const task = deferred<PublicPatternResult>();
    const generation = runtime([task]);
    const options = {
      file: new File(["image"], "photo.png", { type: "image/png" }),
      imageVersion: 1,
      settings: VALID_SETTINGS,
    };
    const { result } = renderHook(() =>
      useGeneratorController({ ...options, runtime: generation.value }),
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => expect(result.current.generate()).toBe(true));
    act(() => expect(result.current.generate()).toBe(false));
    expect(generation.service.generate).toHaveBeenCalledOnce();

    const unavailable = renderHook(() =>
      useGeneratorController({
        ...options,
        runtime: {
          availability: { available: false, reason: "palette-unavailable" },
        },
      }),
    );
    await waitFor(() =>
      expect(unavailable.result.current.state.status).toBe("image-loaded"),
    );
    expect(unavailable.result.current.generate()).toBe(false);
  });

  it("maps raw failures safely and creates a new job when retried", async () => {
    const first = deferred<PublicPatternResult>();
    const second = deferred<PublicPatternResult>();
    const generation = runtime([first, second]);
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const { result } = renderHook(() =>
      useGeneratorController({
        file,
        imageVersion: 1,
        settings: VALID_SETTINGS,
        runtime: generation.value,
      }),
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => void result.current.generate());
    await act(async () =>
      first.reject(new Error("C:\\secret\\photo.png stack")),
    );
    expect(result.current.state).toMatchObject({
      status: "error",
      error: { code: "unknown" },
    });
    expect(JSON.stringify(result.current.state)).not.toContain("secret");

    act(() => expect(result.current.generate()).toBe(true));
    const calls = vi.mocked(generation.service.generate).mock.calls;
    expect(calls[1]![0].jobId).toBeGreaterThan(calls[0]![0].jobId);
    await act(async () => second.resolve(RESULT));
    expect(result.current.state.status).toBe("success");
  });

  it("cancels on image removal and unmount without leaking in StrictMode", async () => {
    const first = deferred<PublicPatternResult>();
    const generation = runtime([first]);
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const { result, rerender, unmount } = renderHook(
      ({ currentFile }) =>
        useGeneratorController({
          file: currentFile,
          imageVersion: 1,
          settings: VALID_SETTINGS,
          runtime: generation.value,
        }),
      { initialProps: { currentFile: file as File | null }, wrapper },
    );
    await waitFor(() => expect(result.current.canGenerate).toBe(true));
    act(() => void result.current.generate());
    const signal = vi.mocked(generation.service.generate).mock.calls[0]![1];
    rerender({ currentFile: null });
    await waitFor(() => expect(result.current.state.status).toBe("idle"));
    expect(signal.aborted).toBe(true);
    unmount();
    await act(async () => first.resolve(RESULT));
  });
});
