import type { ControlledDecoderAuthorityTuple } from "./authority";

export type ControlledCodec = "JPEG" | "PNG" | "WEBP";

export type ControlledDecoderErrorCode =
  | "DECODER_UNAVAILABLE"
  | "ARTIFACT_DIGEST_MISMATCH"
  | "RUNTIME_AUTHORITY_MISMATCH"
  | "INVALID_CODEC_SIGNATURE"
  | "CODEC_DECLARATION_MISMATCH"
  | "UNSUPPORTED_CODEC"
  | "UNSUPPORTED_CODEC_FEATURE"
  | "SOURCE_TOO_LARGE"
  | "ENCODED_DIMENSION_LIMIT_EXCEEDED"
  | "PIXEL_LIMIT_EXCEEDED"
  | "METADATA_LIMIT_EXCEEDED"
  | "INVALID_ICC_PROFILE"
  | "UNSUPPORTED_COLOR_PROFILE"
  | "INVALID_EXIF"
  | "UNSUPPORTED_EXIF"
  | "ORIENTATION_NORMALIZATION_FAILED"
  | "OUTPUT_BUFFER_LENGTH_MISMATCH"
  | "DECODE_TIMEOUT"
  | "DECODE_TRAP"
  | "DECODE_FAILED";

export type InitializeRequest = {
  readonly version: "PoparoozControlledDecoderWorker/1.0.0";
  readonly kind: "INITIALIZE";
  readonly requestId: string;
  readonly wasmBytes: Uint8Array;
  readonly expectedArtifactSha256: string;
  readonly expectedAuthorityTuple: ControlledDecoderAuthorityTuple;
};

export type DecodeRequest = {
  readonly version: "PoparoozControlledDecoderWorker/1.0.0";
  readonly kind: "DECODE";
  readonly requestId: string;
  readonly sourceBytes: Uint8Array;
  readonly expectedCodec: ControlledCodec;
};

export type WorkerRequest = InitializeRequest | DecodeRequest;

export type DecodedImageAuthority = {
  readonly encodedWidth: number;
  readonly encodedHeight: number;
  readonly decodedWidth: number;
  readonly decodedHeight: number;
  readonly orientationObserved: number;
  readonly orientationState: "ORIENTATION_1";
  readonly iccState: string;
  readonly pixelFormat: "RGBA8_UNPREMULTIPLIED";
  readonly rgbaBytes: Uint8Array;
  readonly decodedPixelSha256: string;
  readonly actualCodec: ControlledCodec;
  readonly decoderImplementationId: "poparooz-controlled-image-decoder-wasm";
  readonly decoderImplementationVersion: "1.0.0";
  readonly decoderArtifactSha256: string;
  readonly runtimeAbiVersion: "PoparoozControlledDecoderABI/1.0.0";
};

export type WorkerResponse =
  | { readonly kind: "READY"; readonly requestId: string }
  | {
      readonly kind: "DECODED";
      readonly requestId: string;
      readonly value: DecodedImageAuthority;
    }
  | {
      readonly kind: "ERROR";
      readonly requestId: string;
      readonly code: ControlledDecoderErrorCode;
    };

export class ControlledDecoderError extends Error {
  constructor(readonly code: ControlledDecoderErrorCode) {
    super(code);
    this.name = "ControlledDecoderError";
  }
}
