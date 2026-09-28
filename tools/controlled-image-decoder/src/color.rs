use moxcms::{ColorProfile, InterpolationMethod, Layout, RenderingIntent, TransformOptions};

use crate::error::{DecoderError, ErrorCode};

pub fn convert_rgba_to_srgb(
    rgba: &[u8],
    profile: &[u8],
    maximum_profile_bytes: u32,
) -> Result<Vec<u8>, DecoderError> {
    if profile.len()
        > usize::try_from(maximum_profile_bytes)
            .map_err(|_| DecoderError::new(ErrorCode::MetadataLimitExceeded))?
    {
        return Err(DecoderError::new(ErrorCode::MetadataLimitExceeded));
    }
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
