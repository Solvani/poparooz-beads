use image::{metadata::Orientation, DynamicImage};

pub fn apply(image: &mut DynamicImage, orientation: Orientation) {
    image.apply_orientation(orientation);
}

pub fn to_exif(orientation: Orientation) -> u8 {
    orientation.to_exif()
}

#[cfg(test)]
mod tests {
    use image::{ImageBuffer, Rgba};

    use super::*;

    #[test]
    fn normalizes_all_exif_orientations_to_exact_rgba_layouts() {
        let expected: [&[u8]; 8] = [
            &[1, 2, 3, 4, 5, 6],
            &[2, 1, 4, 3, 6, 5],
            &[6, 5, 4, 3, 2, 1],
            &[5, 6, 3, 4, 1, 2],
            &[1, 3, 5, 2, 4, 6],
            &[5, 3, 1, 6, 4, 2],
            &[6, 4, 2, 5, 3, 1],
            &[2, 4, 6, 1, 3, 5],
        ];
        for exif in 1..=8u8 {
            let pixels = (1..=6u8)
                .flat_map(|value| [value, 0, 0, 255])
                .collect::<Vec<_>>();
            let mut image = DynamicImage::ImageRgba8(
                ImageBuffer::<Rgba<u8>, _>::from_raw(2, 3, pixels).unwrap(),
            );
            let orientation = Orientation::from_exif(exif).unwrap();
            apply(&mut image, orientation);
            let actual = image
                .into_rgba8()
                .into_raw()
                .chunks_exact(4)
                .map(|pixel| pixel[0])
                .collect::<Vec<_>>();
            assert_eq!(actual, expected[usize::from(exif - 1)]);
            assert_eq!(to_exif(orientation), exif);
        }
    }
}
