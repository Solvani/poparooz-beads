#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[allow(dead_code)]
pub enum ErrorCode {
    DecoderUnavailable,
    ArtifactDigestMismatch,
    RuntimeAuthorityMismatch,
    InvalidCodecSignature,
    CodecDeclarationMismatch,
    UnsupportedCodec,
    UnsupportedCodecFeature,
    SourceTooLarge,
    EncodedDimensionLimitExceeded,
    PixelLimitExceeded,
    MetadataLimitExceeded,
    InvalidIccProfile,
    UnsupportedColorProfile,
    InvalidExif,
    UnsupportedExif,
    OrientationNormalizationFailed,
    OutputBufferLengthMismatch,
    DecodeTimeout,
    DecodeTrap,
    DecodeFailed,
}

impl ErrorCode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::DecoderUnavailable => "DECODER_UNAVAILABLE",
            Self::ArtifactDigestMismatch => "ARTIFACT_DIGEST_MISMATCH",
            Self::RuntimeAuthorityMismatch => "RUNTIME_AUTHORITY_MISMATCH",
            Self::InvalidCodecSignature => "INVALID_CODEC_SIGNATURE",
            Self::CodecDeclarationMismatch => "CODEC_DECLARATION_MISMATCH",
            Self::UnsupportedCodec => "UNSUPPORTED_CODEC",
            Self::UnsupportedCodecFeature => "UNSUPPORTED_CODEC_FEATURE",
            Self::SourceTooLarge => "SOURCE_TOO_LARGE",
            Self::EncodedDimensionLimitExceeded => "ENCODED_DIMENSION_LIMIT_EXCEEDED",
            Self::PixelLimitExceeded => "PIXEL_LIMIT_EXCEEDED",
            Self::MetadataLimitExceeded => "METADATA_LIMIT_EXCEEDED",
            Self::InvalidIccProfile => "INVALID_ICC_PROFILE",
            Self::UnsupportedColorProfile => "UNSUPPORTED_COLOR_PROFILE",
            Self::InvalidExif => "INVALID_EXIF",
            Self::UnsupportedExif => "UNSUPPORTED_EXIF",
            Self::OrientationNormalizationFailed => "ORIENTATION_NORMALIZATION_FAILED",
            Self::OutputBufferLengthMismatch => "OUTPUT_BUFFER_LENGTH_MISMATCH",
            Self::DecodeTimeout => "DECODE_TIMEOUT",
            Self::DecodeTrap => "DECODE_TRAP",
            Self::DecodeFailed => "DECODE_FAILED",
        }
    }
}

#[derive(Debug)]
pub struct DecoderError {
    code: ErrorCode,
}

impl DecoderError {
    pub const fn new(code: ErrorCode) -> Self {
        Self { code }
    }
    #[cfg(test)]
    pub const fn code(&self) -> ErrorCode {
        self.code
    }
    pub fn to_wire(&self) -> String {
        format!("{{\"code\":\"{}\"}}", self.code.as_str())
    }
}
