import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ObjectUrlApi } from "./use-image-source";
import { useImageSource } from "./use-image-source";

function image(name = "photo.png", type = "image/png") {
  return new File(["image"], name, { type });
}

function objectUrlApi(): ObjectUrlApi {
  let nextId = 1;
  return {
    createObjectURL: vi.fn(() => `blob:preview-${nextId++}`),
    revokeObjectURL: vi.fn(),
  };
}

describe("useImageSource", () => {
  it("creates, replaces, removes, and releases local preview URLs", () => {
    const urls = objectUrlApi();
    const { result, unmount } = renderHook(() => useImageSource(urls));

    act(() => void result.current.selectFiles([image()]));
    expect(result.current.source?.objectUrl).toBe("blob:preview-1");
    expect(urls.createObjectURL).toHaveBeenCalledTimes(1);

    act(
      () => void result.current.selectFiles([image("next.webp", "image/webp")]),
    );
    expect(result.current.source?.objectUrl).toBe("blob:preview-2");
    expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");

    act(() => result.current.removeImage());
    expect(result.current.source).toBeNull();
    expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:preview-2");
    unmount();
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("preserves a valid preview when a replacement is invalid", () => {
    const urls = objectUrlApi();
    const { result } = renderHook(() => useImageSource(urls));
    act(() => void result.current.selectFiles([image()]));

    act(
      () =>
        void result.current.selectFiles([
          new File(["text"], "notes.txt", { type: "text/plain" }),
        ]),
    );

    expect(result.current.source?.objectUrl).toBe("blob:preview-1");
    expect(result.current.error?.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(urls.createObjectURL).toHaveBeenCalledTimes(1);
    expect(urls.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("releases the active URL once when unmounted", () => {
    const urls = objectUrlApi();
    const { result, unmount } = renderHook(() => useImageSource(urls));
    act(() => void result.current.selectFiles([image()]));

    unmount();
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });
});
