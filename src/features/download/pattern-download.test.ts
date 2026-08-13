import { describe, expect, it, vi } from "vitest";

import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import {
  createPatternExportLogoLoader,
  createPatternDownloader,
  type PatternDownloadEnvironment,
} from "./pattern-download";

const input = {
  pattern: createPublicPattern(),
  selectedColorSetLabel: "72-Color Set",
};

function environment(
  toBlob: HTMLCanvasElement["toBlob"] = (callback) =>
    callback(new Blob(["png"], { type: "image/png" })),
) {
  const canvas = { toBlob } as HTMLCanvasElement;
  const value: PatternDownloadEnvironment = {
    loadLogo: vi.fn(async () => ({
      source: {} as CanvasImageSource,
      width: 1154,
      height: 428,
    })),
    render: vi.fn(() => ({
      ok: true as const,
      canvas,
      filename: "poparooz-pattern-2x2-code.png",
      geometry: {
        width: 100,
        height: 100,
        gridX: 32,
        gridY: 100,
        gridWidth: 48,
        gridHeight: 48,
        logoWidth: 100,
        logoHeight: 40,
        legendColumns: 1,
        legendRows: 2,
      },
    })),
    createObjectURL: vi.fn(() => "blob:pattern"),
    revokeObjectURL: vi.fn(),
    triggerDownload: vi.fn(),
  };
  return value;
}

describe("createPatternDownloader", () => {
  it("downloads a PNG and revokes the Blob URL", async () => {
    const target = environment();
    const downloader = createPatternDownloader(target);
    await expect(downloader.download(input)).resolves.toEqual({ ok: true });
    expect(target.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/png" }),
    );
    expect(target.triggerDownload).toHaveBeenCalledWith(
      "blob:pattern",
      "poparooz-pattern-2x2-code.png",
    );
    expect(target.revokeObjectURL).toHaveBeenCalledWith("blob:pattern");
  });

  it("blocks a concurrent export without starting a second render", async () => {
    let complete: BlobCallback = () => {};
    const target = environment((callback) => {
      complete = callback;
    });
    const downloader = createPatternDownloader(target);
    const first = downloader.download(input);
    await expect(downloader.download(input)).resolves.toEqual({
      ok: false,
      message: "Your pattern download is already being prepared.",
    });
    expect(target.render).toHaveBeenCalledOnce();
    complete(new Blob(["png"], { type: "image/png" }));
    await expect(first).resolves.toEqual({ ok: true });
  });

  it("returns a safe error for a missing Blob without creating a URL", async () => {
    const target = environment((callback) => callback(null));
    const downloader = createPatternDownloader(target);
    await expect(downloader.download(input)).resolves.toEqual({
      ok: false,
      message: "We couldn’t prepare this pattern download.",
    });
    expect(target.createObjectURL).not.toHaveBeenCalled();
  });

  it("fails safely when the official logo cannot be decoded", async () => {
    const target = environment();
    vi.mocked(target.loadLogo).mockRejectedValue(new Error("decode failed"));
    const downloader = createPatternDownloader(target);
    await expect(downloader.download(input)).resolves.toEqual({
      ok: false,
      message: "We couldn’t prepare this pattern download.",
    });
    expect(target.render).not.toHaveBeenCalled();
    expect(target.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("createPatternExportLogoLoader", () => {
  it("decodes and caches one same-origin official logo image", async () => {
    const image = {
      decoding: "auto",
      src: "",
      decode: vi.fn(async () => {}),
      naturalWidth: 1154,
      naturalHeight: 428,
    } as unknown as HTMLImageElement;
    const createImage = vi.fn(() => image);
    const load = createPatternExportLogoLoader(
      "/assets/poparooz-logo.hash.png",
      createImage,
    );
    const first = await load();
    const second = await load();
    expect(first).toBe(second);
    expect(first).toEqual({ source: image, width: 1154, height: 428 });
    expect(image.decoding).toBe("async");
    expect(image.src).toContain("/assets/poparooz-logo.hash.png");
    expect(image.decode).toHaveBeenCalledOnce();
    expect(createImage).toHaveBeenCalledOnce();
  });
});
