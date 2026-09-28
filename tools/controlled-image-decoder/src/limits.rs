use crate::error::{DecoderError, ErrorCode};

#[derive(Clone, Copy, Debug)]
pub struct DecodeLimits {
    pub maximum_source_bytes: u32,
    pub maximum_encoded_width: u32,
    pub maximum_encoded_height: u32,
    pub maximum_pixel_count: u32,
    pub maximum_decoded_rgba_bytes: u32,
    pub maximum_icc_profile_bytes: u32,
    pub maximum_exif_bytes: u32,
    pub maximum_total_ancillary_bytes: u32,
    pub maximum_frames: u32,
}

impl DecodeLimits {
    #[cfg(test)]
    pub const fn qualification_defaults() -> Self {
        Self {
            maximum_source_bytes: 20 * 1024 * 1024,
            maximum_encoded_width: 8192,
            maximum_encoded_height: 8192,
            maximum_pixel_count: 40_000_000,
            maximum_decoded_rgba_bytes: 160_000_000,
            maximum_icc_profile_bytes: 1024 * 1024,
            maximum_exif_bytes: 256 * 1024,
            maximum_total_ancillary_bytes: 2 * 1024 * 1024,
            maximum_frames: 1,
        }
    }

    pub fn validate_contract(self) -> Result<(), DecoderError> {
        let expected = Self::qualification_defaults_for_runtime();
        if self.maximum_source_bytes != expected.maximum_source_bytes
            || self.maximum_encoded_width != expected.maximum_encoded_width
            || self.maximum_encoded_height != expected.maximum_encoded_height
            || self.maximum_pixel_count != expected.maximum_pixel_count
            || self.maximum_decoded_rgba_bytes != expected.maximum_decoded_rgba_bytes
            || self.maximum_icc_profile_bytes != expected.maximum_icc_profile_bytes
            || self.maximum_exif_bytes != expected.maximum_exif_bytes
            || self.maximum_total_ancillary_bytes != expected.maximum_total_ancillary_bytes
            || self.maximum_frames != 1
        {
            return Err(DecoderError::new(ErrorCode::RuntimeAuthorityMismatch));
        }
        Ok(())
    }

    const fn qualification_defaults_for_runtime() -> Self {
        Self {
            maximum_source_bytes: 20 * 1024 * 1024,
            maximum_encoded_width: 8192,
            maximum_encoded_height: 8192,
            maximum_pixel_count: 40_000_000,
            maximum_decoded_rgba_bytes: 160_000_000,
            maximum_icc_profile_bytes: 1024 * 1024,
            maximum_exif_bytes: 256 * 1024,
            maximum_total_ancillary_bytes: 2 * 1024 * 1024,
            maximum_frames: 1,
        }
    }

    pub fn validate_source(self, length: usize) -> Result<(), DecoderError> {
        let maximum = usize::try_from(self.maximum_source_bytes)
            .map_err(|_| DecoderError::new(ErrorCode::RuntimeAuthorityMismatch))?;
        if length == 0 || length > maximum {
            return Err(DecoderError::new(ErrorCode::SourceTooLarge));
        }
        Ok(())
    }

    pub fn validate_dimensions(self, width: u32, height: u32) -> Result<(), DecoderError> {
        if width == 0
            || height == 0
            || width > self.maximum_encoded_width
            || height > self.maximum_encoded_height
        {
            return Err(DecoderError::new(ErrorCode::EncodedDimensionLimitExceeded));
        }
        let pixels = width
            .checked_mul(height)
            .ok_or_else(|| DecoderError::new(ErrorCode::PixelLimitExceeded))?;
        if pixels > self.maximum_pixel_count {
            return Err(DecoderError::new(ErrorCode::PixelLimitExceeded));
        }
        let bytes = pixels
            .checked_mul(4)
            .ok_or_else(|| DecoderError::new(ErrorCode::PixelLimitExceeded))?;
        if bytes > self.maximum_decoded_rgba_bytes {
            return Err(DecoderError::new(ErrorCode::PixelLimitExceeded));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_dimensions_before_rgba_allocation() {
        let limits = DecodeLimits::qualification_defaults();
        assert_eq!(
            limits.validate_dimensions(8193, 1).unwrap_err().code(),
            ErrorCode::EncodedDimensionLimitExceeded
        );
        assert_eq!(
            limits.validate_dimensions(8192, 8192).unwrap_err().code(),
            ErrorCode::PixelLimitExceeded
        );
    }

    #[test]
    fn rejects_empty_and_over_limit_sources() {
        let limits = DecodeLimits::qualification_defaults();
        assert_eq!(
            limits.validate_source(0).unwrap_err().code(),
            ErrorCode::SourceTooLarge
        );
        assert_eq!(
            limits
                .validate_source(20 * 1024 * 1024 + 1)
                .unwrap_err()
                .code(),
            ErrorCode::SourceTooLarge
        );
    }
}
