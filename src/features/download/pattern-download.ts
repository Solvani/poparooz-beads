import {
  renderPatternExport,
  type PatternExportInput,
  type PatternExportResult,
} from "./pattern-export";

export type PatternDownloadResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

export interface PatternDownloadEnvironment {
  readonly render: (input: PatternExportInput) => PatternExportResult;
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
        const rendered = environment.render(input);
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

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

const browserEnvironment: PatternDownloadEnvironment = {
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
