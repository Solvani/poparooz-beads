#![allow(
    clippy::missing_errors_doc,
    clippy::must_use_candidate,
    clippy::struct_field_names
)]

mod codec;
mod color;
mod error;
mod limits;
mod orientation;

use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

use crate::codec::{decode_bytes, Codec};
use crate::error::{DecoderError, ErrorCode};
use crate::limits::DecodeLimits;

pub const DECODER_IMPLEMENTATION_ID: &str = "poparooz-controlled-image-decoder-wasm";
pub const DECODER_IMPLEMENTATION_VERSION: &str = "1.0.0";
pub const RUNTIME_ABI_VERSION: &str = "PoparoozControlledDecoderABI/1.0.0";
pub const COLOR_POLICY: &str = "EXPLICIT_SRGB_V1";
pub const EXIF_POLICY: &str = "APPLY_1_TO_8_THEN_ORIENTATION_1";
pub const PIXEL_FORMAT: &str = "RGBA8_UNPREMULTIPLIED";

#[wasm_bindgen]
#[derive(Debug)]
pub struct DecodedImage {
    encoded_width: u32,
    encoded_height: u32,
    decoded_width: u32,
    decoded_height: u32,
    orientation_observed: u8,
    icc_state: String,
    actual_codec: String,
    decoded_pixel_sha256: String,
    rgba: Vec<u8>,
}

#[wasm_bindgen]
impl DecodedImage {
    #[wasm_bindgen(getter)]
    pub fn encoded_width(&self) -> u32 {
        self.encoded_width
    }
    #[wasm_bindgen(getter)]
    pub fn encoded_height(&self) -> u32 {
        self.encoded_height
    }
    #[wasm_bindgen(getter)]
    pub fn decoded_width(&self) -> u32 {
        self.decoded_width
    }
    #[wasm_bindgen(getter)]
    pub fn decoded_height(&self) -> u32 {
        self.decoded_height
    }
    #[wasm_bindgen(getter)]
    pub fn orientation_observed(&self) -> u8 {
        self.orientation_observed
    }
    #[wasm_bindgen(getter)]
    pub fn orientation_state(&self) -> String {
        "ORIENTATION_1".to_owned()
    }
    #[wasm_bindgen(getter)]
    pub fn icc_state(&self) -> String {
        self.icc_state.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn actual_codec(&self) -> String {
        self.actual_codec.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn pixel_format(&self) -> String {
        PIXEL_FORMAT.to_owned()
    }
    #[wasm_bindgen(getter)]
    pub fn decoded_pixel_sha256(&self) -> String {
        self.decoded_pixel_sha256.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn decoder_implementation_id(&self) -> String {
        DECODER_IMPLEMENTATION_ID.to_owned()
    }
    #[wasm_bindgen(getter)]
    pub fn decoder_implementation_version(&self) -> String {
        DECODER_IMPLEMENTATION_VERSION.to_owned()
    }
    #[wasm_bindgen(getter)]
    pub fn runtime_abi_version(&self) -> String {
        RUNTIME_ABI_VERSION.to_owned()
    }
    pub fn rgba_bytes(&self) -> Vec<u8> {
        self.rgba.clone()
    }
}

#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn decode_controlled(
    source: &[u8],
    expected_codec: &str,
    maximum_source_bytes: u32,
    maximum_encoded_width: u32,
    maximum_encoded_height: u32,
    maximum_pixel_count: u32,
    maximum_decoded_rgba_bytes: u32,
    maximum_icc_profile_bytes: u32,
    maximum_exif_bytes: u32,
    maximum_total_ancillary_bytes: u32,
    maximum_frames: u32,
    color_policy: &str,
    exif_policy: &str,
) -> Result<DecodedImage, JsValue> {
    decode_internal(
        source,
        expected_codec,
        DecodeLimits {
            maximum_source_bytes,
            maximum_encoded_width,
            maximum_encoded_height,
            maximum_pixel_count,
            maximum_decoded_rgba_bytes,
            maximum_icc_profile_bytes,
            maximum_exif_bytes,
            maximum_total_ancillary_bytes,
            maximum_frames,
        },
        color_policy,
        exif_policy,
    )
    .map_err(|error| JsValue::from_str(&error.to_wire()))
}

fn decode_internal(
    source: &[u8],
    expected_codec: &str,
    limits: DecodeLimits,
    color_policy: &str,
    exif_policy: &str,
) -> Result<DecodedImage, DecoderError> {
    limits.validate_contract()?;
    limits.validate_source(source.len())?;
    if color_policy != COLOR_POLICY || exif_policy != EXIF_POLICY {
        return Err(DecoderError::new(ErrorCode::RuntimeAuthorityMismatch));
    }
    let expected = Codec::parse(expected_codec)?;
    let actual = Codec::detect(source)?;
    if expected != actual {
        return Err(DecoderError::new(ErrorCode::CodecDeclarationMismatch));
    }
    let decoded = decode_bytes(source, actual, limits)?;
    let expected_len = usize::try_from(decoded.width)
        .ok()
        .and_then(|width| {
            usize::try_from(decoded.height)
                .ok()
                .and_then(|height| width.checked_mul(height))
        })
        .and_then(|pixels| pixels.checked_mul(4))
        .ok_or_else(|| DecoderError::new(ErrorCode::OutputBufferLengthMismatch))?;
    if decoded.rgba.len() != expected_len {
        return Err(DecoderError::new(ErrorCode::OutputBufferLengthMismatch));
    }
    let digest = Sha256::digest(&decoded.rgba);
    Ok(DecodedImage {
        encoded_width: decoded.encoded_width,
        encoded_height: decoded.encoded_height,
        decoded_width: decoded.width,
        decoded_height: decoded.height,
        orientation_observed: decoded.orientation_observed,
        icc_state: decoded.icc_state,
        actual_codec: actual.as_str().to_owned(),
        decoded_pixel_sha256: format!("sha256:{digest:x}"),
        rgba: decoded.rgba,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_runtime_authority_drift_before_decode() {
        let result = decode_internal(
            &[0xff, 0xd8, 0xff],
            "JPEG",
            DecodeLimits::qualification_defaults(),
            "WRONG",
            EXIF_POLICY,
        );
        assert_eq!(
            result.unwrap_err().code(),
            ErrorCode::RuntimeAuthorityMismatch
        );
    }
}
