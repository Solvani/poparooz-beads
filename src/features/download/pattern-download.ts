import poparoozLogoUrl from "../../assets/branding/poparooz-logo.png";

import {
  renderPatternExport,
  type PatternExportInput,
  type PatternExportLogo,
  type PatternExportResult,
} from "./pattern-export";

export type PatternDownloadResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

export interface PatternDownloadEnvironment {
  readonly loadLogo: () => Promise<PatternExportLogo>;
  readonly render: (
    input: PatternExportInput,
    logo: PatternExportLogo,
  ) => PatternExportResult;
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
  readonly triggerDownload: (url: string, filename: string) => void;
}

export interface PatternDownloader {
  download(input: PatternExportInput): Promise<PatternDownloadResult>;
}

const SAFE_DOWNLOAD_ERROR = "We couldn’t prepare this pattern download.";

export function createPatternDownloader(
  environment: PatternDownloadEnvironment = browserEnvironment,
): PatternDownloader {
  let inProgress = false;
  return Object.freeze({
    async download(input: PatternExportInput): Promise<PatternDownloadResult> {
      if (inProgress) {
        return {
          ok: false as const,
          message: "Your pattern download is already being prepared.",
        };
      }
      inProgress = true;
      let objectUrl: string | null = null;
      try {
        const logo = await environment.loadLogo();
        const rendered = environment.render(input, logo);
        if (!rendered.ok) return rendered;
        const blob = await canvasToPngBlob(rendered.canvas);
        if (blob === null || blob.type !== "image/png") {
          return { ok: false, message: SAFE_DOWNLOAD_ERROR };
        }
        objectUrl = environment.createObjectURL(blob);
        environment.triggerDownload(objectUrl, rendered.filename);
        return { ok: true as const };
      } catch {
        return { ok: false, message: SAFE_DOWNLOAD_ERROR };
      } finally {
        if (objectUrl !== null) environment.revokeObjectURL(objectUrl);
        inProgress = false;
      }
    },
  });
}

export function createPatternExportLogoLoader(
  assetUrl = poparoozLogoUrl,
  createImage: () => HTMLImageElement = () => new Image(),
): () => Promise<PatternExportLogo> {
  let cached: Promise<PatternExportLogo> | undefined;
  return () => {
    cached ??= decodePatternExportLogo(assetUrl, createImage);
    return cached;
  };
}

async function decodePatternExportLogo(
  assetUrl: string,
  createImage: () => HTMLImageElement,
): Promise<PatternExportLogo> {
  const image = createImage();
  image.decoding = "async";
  image.src = assetUrl;
  await image.decode();
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error("Invalid official logo dimensions.");
  }
  return Object.freeze({
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

const browserEnvironment: PatternDownloadEnvironment = {
  loadLogo: createPatternExportLogoLoader(),
  render: renderPatternExport,
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  triggerDownload(url, filename) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  },
};
