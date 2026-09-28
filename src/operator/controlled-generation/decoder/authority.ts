export const CONTROLLED_DECODER_ABI =
  "PoparoozControlledDecoderABI/1.0.0" as const;
export const CONTROLLED_DECODER_IMPLEMENTATION = {
  id: "poparooz-controlled-image-decoder-wasm",
  version: "1.0.0",
  colorPolicy: "EXPLICIT_SRGB_V1",
  exifPolicy: "APPLY_1_TO_8_THEN_ORIENTATION_1",
  pixelFormat: "RGBA8_UNPREMULTIPLIED",
} as const;

export const CONTROLLED_DECODER_LIMITS = {
  maximumSourceByteLength: 20 * 1024 * 1024,
  maximumEncodedWidth: 8192,
  maximumEncodedHeight: 8192,
  maximumPixelCount: 40_000_000,
  maximumDecodedRgbaBytes: 160_000_000,
  maximumIccProfileBytes: 1024 * 1024,
  maximumExifBytes: 256 * 1024,
  maximumTotalAncillaryMetadataBytes: 2 * 1024 * 1024,
  maximumFrames: 1,
  decoderWorkerMemoryMaximum: 256 * 1024 * 1024,
  decodeWallClockTimeout: 30_000,
} as const;

export type ControlledDecoderAuthorityTuple = {
  readonly decoderImplementationId: typeof CONTROLLED_DECODER_IMPLEMENTATION.id;
  readonly decoderImplementationVersion: typeof CONTROLLED_DECODER_IMPLEMENTATION.version;
  readonly runtimeAbiVersion: typeof CONTROLLED_DECODER_ABI;
  readonly colorPolicy: typeof CONTROLLED_DECODER_IMPLEMENTATION.colorPolicy;
  readonly exifPolicy: typeof CONTROLLED_DECODER_IMPLEMENTATION.exifPolicy;
  readonly pixelFormat: typeof CONTROLLED_DECODER_IMPLEMENTATION.pixelFormat;
};

export const EXPECTED_CONTROLLED_DECODER_AUTHORITY: ControlledDecoderAuthorityTuple =
  {
    decoderImplementationId: CONTROLLED_DECODER_IMPLEMENTATION.id,
    decoderImplementationVersion: CONTROLLED_DECODER_IMPLEMENTATION.version,
    runtimeAbiVersion: CONTROLLED_DECODER_ABI,
    colorPolicy: CONTROLLED_DECODER_IMPLEMENTATION.colorPolicy,
    exifPolicy: CONTROLLED_DECODER_IMPLEMENTATION.exifPolicy,
    pixelFormat: CONTROLLED_DECODER_IMPLEMENTATION.pixelFormat,
  };

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digestInput = new Uint8Array(bytes.byteLength);
  digestInput.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function hasExactAuthorityTuple(
  actual: ControlledDecoderAuthorityTuple,
): boolean {
  return Object.entries(EXPECTED_CONTROLLED_DECODER_AUTHORITY).every(
    ([key, value]) =>
      actual[key as keyof ControlledDecoderAuthorityTuple] === value,
  );
}
