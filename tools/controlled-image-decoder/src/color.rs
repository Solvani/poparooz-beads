use moxcms::{ColorProfile, InterpolationMethod, Layout, RenderingIntent, TransformOptions};

use crate::error::{DecoderError, ErrorCode};

pub fn convert_rgba_to_srgb(
    rgba: &[u8],
    profile: &[u8],
    maximum_profile_bytes: u32,
) -> Result<Vec<u8>, DecoderError> {
    validate_icc_profile(profile, maximum_profile_bytes)?;
    let source = ColorProfile::new_from_slice(profile)
        .map_err(|_| DecoderError::new(ErrorCode::InvalidIccProfile))?;
    let destination = ColorProfile::new_srgb();
    let options = TransformOptions {
        rendering_intent: RenderingIntent::RelativeColorimetric,
        prefer_fixed_point: true,
        interpolation_method: InterpolationMethod::Tetrahedral,
        allow_use_cicp_transfer: false,
        ..TransformOptions::default()
    };
    let transform = source
        .create_transform_8bit(Layout::Rgba, &destination, Layout::Rgba, options)
        .map_err(|_| DecoderError::new(ErrorCode::UnsupportedColorProfile))?;
    let mut output = vec![0; rgba.len()];
    transform
        .transform(rgba, &mut output)
        .map_err(|_| DecoderError::new(ErrorCode::UnsupportedColorProfile))?;
    Ok(output)
}

pub fn validate_icc_profile(
    profile: &[u8],
    maximum_profile_bytes: u32,
) -> Result<(), DecoderError> {
    if profile.len()
        > usize::try_from(maximum_profile_bytes)
            .map_err(|_| DecoderError::new(ErrorCode::MetadataLimitExceeded))?
    {
        return Err(DecoderError::new(ErrorCode::MetadataLimitExceeded));
    }
    ColorProfile::new_from_slice(profile)
        .map_err(|_| DecoderError::new(ErrorCode::InvalidIccProfile))?;
    if !has_supported_input_profile_class(profile) {
        return Err(DecoderError::new(ErrorCode::UnsupportedColorProfile));
    }
    Ok(())
}

fn has_supported_input_profile_class(profile: &[u8]) -> bool {
    profile
        .get(12..16)
        .is_some_and(|class| matches!(class, b"scnr" | b"mntr" | b"prtr"))
}

#[cfg(test)]
mod tests {
    use super::has_supported_input_profile_class;

    #[test]
    fn accepts_only_device_input_profile_classes() {
        for class in [b"scnr", b"mntr", b"prtr"] {
            let mut profile = [0_u8; 16];
            profile[12..16].copy_from_slice(class);
            assert!(has_supported_input_profile_class(&profile));
        }
        for class in [b"link", b"spac", b"abst", b"nmcl"] {
            let mut profile = [0_u8; 16];
            profile[12..16].copy_from_slice(class);
            assert!(!has_supported_input_profile_class(&profile));
        }
    }
}
