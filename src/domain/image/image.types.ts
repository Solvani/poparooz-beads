export type ImageFormat = "jpeg" | "png" | "webp";
export type ImageBackground = "transparent" | "white";
export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface RgbaImage {
  width: number;
  height: number;
  /** Unpremultiplied RGBA channels in row-major order, each from 0 through 255. */
  data: Uint8ClampedArray;
}

export interface NormalizeImageOptions {
  targetWidth: number;
  targetHeight: number;
  preserveAspectRatio: true;
  fit: "contain";
  background: ImageBackground;
  allowUpscale: boolean;
}

export interface ContainFitResult {
  width: number;
  height: number;
  fit: "contain";
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

export interface ImageSourceMetadata {
  format: ImageFormat;
  originalWidth: number;
  originalHeight: number;
  orientedWidth: number;
  orientedHeight: number;
  exifOrientation: ExifOrientation;
  hasAlpha: boolean;
}

export interface NormalizedImageResult {
  source: ImageSourceMetadata;
  target: ContainFitResult;
  image: RgbaImage;
}

export interface ExifOrientationResult {
  orientation: ExifOrientation;
  status: "present" | "missing" | "invalid";
}
