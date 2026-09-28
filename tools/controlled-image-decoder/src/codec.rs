use std::io::{BufReader, Cursor};

use image::{
    codecs::{jpeg::JpegDecoder, png::PngDecoder, webp::WebPDecoder},
    DynamicImage, ExtendedColorType, ImageDecoder,
};

use crate::color::convert_rgba_to_srgb;
use crate::error::{DecoderError, ErrorCode};
use crate::limits::DecodeLimits;
use crate::orientation::{apply, to_exif};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Codec {
    Jpeg,
    Png,
    Webp,
}

impl Codec {
    pub fn parse(value: &str) -> Result<Self, DecoderError> {
        match value {
            "JPEG" => Ok(Self::Jpeg),
            "PNG" => Ok(Self::Png),
            "WEBP" => Ok(Self::Webp),
            _ => Err(DecoderError::new(ErrorCode::UnsupportedCodec)),
        }
    }
    pub fn detect(bytes: &[u8]) -> Result<Self, DecoderError> {
        if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
            return Ok(Self::Jpeg);
        }
        if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]) {
            return Ok(Self::Png);
        }
        if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
            return Ok(Self::Webp);
        }
        Err(DecoderError::new(ErrorCode::InvalidCodecSignature))
    }
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Jpeg => "JPEG",
            Self::Png => "PNG",
            Self::Webp => "WEBP",
        }
    }
}

pub struct DecodedPixels {
    pub encoded_width: u32,
    pub encoded_height: u32,
    pub width: u32,
    pub height: u32,
    pub orientation_observed: u8,
    pub icc_state: String,
    pub rgba: Vec<u8>,
}

pub fn decode_bytes(
    source: &[u8],
    codec: Codec,
    limits: DecodeLimits,
) -> Result<DecodedPixels, DecoderError> {
    match codec {
        Codec::Jpeg => {
            inspect_jpeg(source, limits)?;
            decode(
                JpegDecoder::new(BufReader::new(Cursor::new(source)))
                    .map_err(|_| DecoderError::new(ErrorCode::DecodeFailed))?,
                limits,
                false,
                false,
            )
        }
        Codec::Png => {
            let png_has_explicit_srgb = inspect_png(source, limits)?;
            decode(
                PngDecoder::new(BufReader::new(Cursor::new(source)))
                    .map_err(|_| DecoderError::new(ErrorCode::DecodeFailed))?,
                limits,
                true,
                png_has_explicit_srgb,
            )
        }
        Codec::Webp => {
            inspect_webp(source, limits)?;
            decode(
                WebPDecoder::new(BufReader::new(Cursor::new(source)))
                    .map_err(|_| DecoderError::new(ErrorCode::DecodeFailed))?,
                limits,
                false,
                false,
            )
        }
    }
}

fn decode<D: ImageDecoder>(
    mut decoder: D,
    limits: DecodeLimits,
    reject_sixteen_bit: bool,
    png_has_explicit_srgb: bool,
) -> Result<DecodedPixels, DecoderError> {
    let (encoded_width, encoded_height) = decoder.dimensions();
    limits.validate_dimensions(encoded_width, encoded_height)?;
    if reject_sixteen_bit
        && matches!(
            decoder.original_color_type(),
            ExtendedColorType::L16
                | ExtendedColorType::La16
                | ExtendedColorType::Rgb16
                | ExtendedColorType::Rgba16
        )
    {
        return Err(DecoderError::new(ErrorCode::UnsupportedCodecFeature));
    }
    if matches!(
        decoder.original_color_type(),
        ExtendedColorType::Cmyk8 | ExtendedColorType::Cmyk16
    ) {
        return Err(DecoderError::new(ErrorCode::UnsupportedCodecFeature));
    }
    let orientation = decoder
        .orientation()
        .map_err(|_| DecoderError::new(ErrorCode::InvalidExif))?;
    let exif = decoder
        .exif_metadata()
        .map_err(|_| DecoderError::new(ErrorCode::InvalidExif))?;
    if exif
        .as_ref()
        .is_some_and(|value| value.len() > usize::try_from(limits.maximum_exif_bytes).unwrap_or(0))
    {
        return Err(DecoderError::new(ErrorCode::MetadataLimitExceeded));
    }
    let icc = decoder
        .icc_profile()
        .map_err(|_| DecoderError::new(ErrorCode::InvalidIccProfile))?;
    let image = DynamicImage::from_decoder(decoder)
        .map_err(|_| DecoderError::new(ErrorCode::DecodeFailed))?;
    let mut image = image;
    let orientation_observed = to_exif(orientation);
    apply(&mut image, orientation);
    let mut rgba = image.into_rgba8().into_raw();
    let icc_state = if let Some(profile) = icc {
        rgba = convert_rgba_to_srgb(&rgba, &profile, limits.maximum_icc_profile_bytes)?;
        "CONVERTED_TO_SRGB".to_owned()
    } else if reject_sixteen_bit && png_has_explicit_srgb {
        "EXPLICIT_SRGB_METADATA".to_owned()
    } else {
        "ASSUMED_SRGB_BY_POLICY".to_owned()
    };
    let swaps = matches!(orientation_observed, 5..=8);
    let (width, height) = if swaps {
        (encoded_height, encoded_width)
    } else {
        (encoded_width, encoded_height)
    };
    limits.validate_dimensions(width, height)?;
    Ok(DecodedPixels {
        encoded_width,
        encoded_height,
        width,
        height,
        orientation_observed,
        icc_state,
        rgba,
    })
}

fn inspect_jpeg(source: &[u8], limits: DecodeLimits) -> Result<(), DecoderError> {
    let mut offset = 2usize;
    let mut metadata = 0usize;
    let mut exif_segments = 0u8;
    while offset + 1 < source.len() {
        if source[offset] != 0xff {
            offset += 1;
            continue;
        }
        let marker = source[offset + 1];
        offset += 2;
        if marker == 0xd9 || marker == 0xda {
            break;
        }
        if marker == 0x00 || marker == 0x01 || (0xd0..=0xd7).contains(&marker) {
            continue;
        }
        if offset + 2 > source.len() {
            return Err(DecoderError::new(ErrorCode::DecodeFailed));
        }
        let segment_length = usize::from(u16::from_be_bytes([source[offset], source[offset + 1]]));
        if segment_length < 2
            || offset
                .checked_add(segment_length)
                .is_none_or(|end| end > source.len())
        {
            return Err(DecoderError::new(ErrorCode::DecodeFailed));
        }
        let payload = &source[offset + 2..offset + segment_length];
        if (0xe0..=0xef).contains(&marker) || marker == 0xfe {
            metadata = metadata
                .checked_add(payload.len())
                .ok_or_else(|| DecoderError::new(ErrorCode::MetadataLimitExceeded))?;
        }
        if marker == 0xe1 && payload.starts_with(b"Exif\0\0") {
            exif_segments = exif_segments.saturating_add(1);
            if payload.len() > usize::try_from(limits.maximum_exif_bytes).unwrap_or(0) {
                return Err(DecoderError::new(ErrorCode::MetadataLimitExceeded));
            }
        }
        offset += segment_length;
    }
    validate_metadata(metadata, exif_segments, limits)
}

fn inspect_png(source: &[u8], limits: DecodeLimits) -> Result<bool, DecoderError> {
    const SRGB_CHRM: [u32; 8] = [
        31_270, 32_900, 64_000, 33_000, 30_000, 60_000, 15_000, 6_000,
    ];
    let mut offset = 8usize;
    let mut metadata = 0usize;
    let mut exif_chunks = 0u8;
    let mut srgb_chunks = 0u8;
    let mut iccp_chunks = 0u8;
    let mut gamma = None;
    let mut chromaticity = None;
    while offset + 12 <= source.len() {
        let length = u32::from_be_bytes(
            source[offset..offset + 4]
                .try_into()
                .map_err(|_| DecoderError::new(ErrorCode::DecodeFailed))?,
        ) as usize;
        let kind = &source[offset + 4..offset + 8];
        let data_start = offset + 8;
        let data_end = data_start
            .checked_add(length)
            .ok_or_else(|| DecoderError::new(ErrorCode::MetadataLimitExceeded))?;
        let chunk_end = data_end
            .checked_add(4)
            .ok_or_else(|| DecoderError::new(ErrorCode::MetadataLimitExceeded))?;
        if chunk_end > source.len() {
            return Err(DecoderError::new(ErrorCode::DecodeFailed));
        }
        let data = &source[data_start..data_end];
        if kind[0] & 0x20 != 0 {
            metadata = metadata
                .checked_add(length)
                .ok_or_else(|| DecoderError::new(ErrorCode::MetadataLimitExceeded))?;
        }
        match kind {
            b"acTL" => return Err(DecoderError::new(ErrorCode::UnsupportedCodecFeature)),
            b"eXIf" => {
                exif_chunks = exif_chunks.saturating_add(1);
                if length > usize::try_from(limits.maximum_exif_bytes).unwrap_or(0) {
                    return Err(DecoderError::new(ErrorCode::MetadataLimitExceeded));
                }
            }
            b"sRGB" => srgb_chunks = srgb_chunks.saturating_add(1),
            b"iCCP" => iccp_chunks = iccp_chunks.saturating_add(1),
            b"gAMA" if data.len() == 4 => {
                gamma = Some(u32::from_be_bytes(data.try_into().map_err(|_| {
                    DecoderError::new(ErrorCode::UnsupportedColorProfile)
                })?));
            }
            b"cHRM" if data.len() == 32 => {
                let mut values = [0u32; 8];
                for (index, value) in values.iter_mut().enumerate() {
                    let start = index * 4;
                    *value = u32::from_be_bytes(
                        data[start..start + 4]
                            .try_into()
                            .map_err(|_| DecoderError::new(ErrorCode::UnsupportedColorProfile))?,
                    );
                }
                chromaticity = Some(values);
            }
            _ => {}
        }
        offset = chunk_end;
        if kind == b"IEND" {
            break;
        }
    }
    validate_metadata(metadata, exif_chunks, limits)?;
    if srgb_chunks > 1 || iccp_chunks > 1 || (srgb_chunks > 0 && iccp_chunks > 0) {
        return Err(DecoderError::new(ErrorCode::UnsupportedColorProfile));
    }
    let standard_equivalent = gamma == Some(45_455) && chromaticity == Some(SRGB_CHRM);
    if gamma.is_some() != chromaticity.is_some() || (gamma.is_some() && !standard_equivalent) {
        return Err(DecoderError::new(ErrorCode::UnsupportedColorProfile));
    }
    if iccp_chunks == 0 && srgb_chunks == 0 && !standard_equivalent {
        return Err(DecoderError::new(ErrorCode::UnsupportedColorProfile));
    }
    Ok(srgb_chunks == 1 || standard_equivalent)
}

fn inspect_webp(source: &[u8], limits: DecodeLimits) -> Result<(), DecoderError> {
    let mut offset = 12usize;
    let mut metadata = 0usize;
    let mut exif_chunks = 0u8;
    while offset + 8 <= source.len() {
        let kind = &source[offset..offset + 4];
        let length = u32::from_le_bytes(
            source[offset + 4..offset + 8]
                .try_into()
                .map_err(|_| DecoderError::new(ErrorCode::DecodeFailed))?,
        ) as usize;
        let data_start = offset + 8;
        let data_end = data_start
            .checked_add(length)
            .ok_or_else(|| DecoderError::new(ErrorCode::MetadataLimitExceeded))?;
        if data_end > source.len() {
            return Err(DecoderError::new(ErrorCode::DecodeFailed));
        }
        if kind == b"ANIM" || kind == b"ANMF" {
            return Err(DecoderError::new(ErrorCode::UnsupportedCodecFeature));
        }
        if matches!(kind, b"ICCP" | b"EXIF" | b"XMP ") {
            metadata = metadata
                .checked_add(length)
                .ok_or_else(|| DecoderError::new(ErrorCode::MetadataLimitExceeded))?;
        }
        if kind == b"EXIF" {
            exif_chunks = exif_chunks.saturating_add(1);
            if length > usize::try_from(limits.maximum_exif_bytes).unwrap_or(0) {
                return Err(DecoderError::new(ErrorCode::MetadataLimitExceeded));
            }
        }
        offset = data_end + (length & 1);
    }
    validate_metadata(metadata, exif_chunks, limits)
}

fn validate_metadata(
    metadata: usize,
    exif_items: u8,
    limits: DecodeLimits,
) -> Result<(), DecoderError> {
    if metadata > usize::try_from(limits.maximum_total_ancillary_bytes).unwrap_or(0) {
        return Err(DecoderError::new(ErrorCode::MetadataLimitExceeded));
    }
    if exif_items > 1 {
        return Err(DecoderError::new(ErrorCode::InvalidExif));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[allow(clippy::trivially_copy_pass_by_ref)]
    fn png_chunk(kind: &[u8; 4], data: &[u8]) -> Vec<u8> {
        let mut chunk = Vec::new();
        chunk.extend_from_slice(&u32::try_from(data.len()).unwrap().to_be_bytes());
        chunk.extend_from_slice(kind);
        chunk.extend_from_slice(data);
        chunk.extend_from_slice(&[0; 4]);
        chunk
    }

    fn minimal_png(chunks: &[Vec<u8>]) -> Vec<u8> {
        let mut bytes = vec![0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a];
        for chunk in chunks {
            bytes.extend_from_slice(chunk);
        }
        bytes.extend_from_slice(&png_chunk(b"IEND", &[]));
        bytes
    }

    #[test]
    fn detects_only_authorized_signatures() {
        assert_eq!(Codec::detect(&[0xff, 0xd8, 0xff]).unwrap(), Codec::Jpeg);
        assert_eq!(
            Codec::detect(&[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]).unwrap(),
            Codec::Png
        );
        assert_eq!(Codec::detect(b"RIFF\0\0\0\0WEBP").unwrap(), Codec::Webp);
        assert_eq!(
            Codec::detect(b"GIF89a").unwrap_err().code(),
            ErrorCode::InvalidCodecSignature
        );
    }

    #[test]
    fn rejects_apng_before_decode() {
        let source = minimal_png(&[png_chunk(b"acTL", &[0; 8])]);
        assert_eq!(
            inspect_png(&source, DecodeLimits::qualification_defaults())
                .unwrap_err()
                .code(),
            ErrorCode::UnsupportedCodecFeature
        );
    }

    #[test]
    fn accepts_only_explicit_standard_png_srgb_metadata() {
        let explicit = minimal_png(&[png_chunk(b"sRGB", &[0])]);
        assert!(inspect_png(&explicit, DecodeLimits::qualification_defaults()).unwrap());

        let absent = minimal_png(&[]);
        assert_eq!(
            inspect_png(&absent, DecodeLimits::qualification_defaults())
                .unwrap_err()
                .code(),
            ErrorCode::UnsupportedColorProfile
        );
    }

    #[test]
    fn rejects_animated_webp_before_decode() {
        let mut source = b"RIFF\x0a\x00\x00\x00WEBP".to_vec();
        source.extend_from_slice(b"ANIM\x00\x00\x00\x00");
        assert_eq!(
            inspect_webp(&source, DecodeLimits::qualification_defaults())
                .unwrap_err()
                .code(),
            ErrorCode::UnsupportedCodecFeature
        );
    }

    #[test]
    fn rejects_duplicate_exif_metadata() {
        let source = minimal_png(&[
            png_chunk(b"eXIf", &[0]),
            png_chunk(b"eXIf", &[0]),
            png_chunk(b"sRGB", &[0]),
        ]);
        assert_eq!(
            inspect_png(&source, DecodeLimits::qualification_defaults())
                .unwrap_err()
                .code(),
            ErrorCode::InvalidExif
        );
    }

    #[test]
    fn preserves_exact_straight_rgba_alpha_sentinels() {
        let rgba = [
            10, 20, 30, 0, 11, 21, 31, 1, 12, 22, 32, 127, 13, 23, 33, 128, 14, 24, 34, 254, 15,
            25, 35, 255,
        ];
        let mut png_bytes = Vec::new();
        {
            let mut png_encoder = png::Encoder::new(&mut png_bytes, 6, 1);
            png_encoder.set_color(png::ColorType::Rgba);
            png_encoder.set_depth(png::BitDepth::Eight);
            png_encoder.set_source_srgb(png::SrgbRenderingIntent::RelativeColorimetric);
            let mut writer = png_encoder.write_header().unwrap();
            writer.write_image_data(&rgba).unwrap();
        }
        let decoded = decode_bytes(
            &png_bytes,
            Codec::Png,
            DecodeLimits::qualification_defaults(),
        )
        .unwrap();
        assert_eq!(decoded.rgba, rgba);
        assert_eq!(decoded.icc_state, "EXPLICIT_SRGB_METADATA");
        assert_eq!((decoded.width, decoded.height), (6, 1));
    }
}
