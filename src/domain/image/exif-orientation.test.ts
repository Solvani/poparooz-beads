import { describe, expect, it } from "vitest";

import {
  createExifJpeg,
  MINIMAL_JPEG_BYTES,
  MINIMAL_PNG_BYTES,
  redChannelRows,
  rgbaFromIds,
} from "./image-test.fixture";
import { readExifOrientation } from "./exif-orientation";
import { applyExifOrientation, getOrientedDimensions } from "./exif-transform";
import type { ExifOrientation } from "./image.types";

describe("minimal EXIF orientation parser", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8] as const)(
    "reads little-endian orientation %s",
    (orientation) => {
      expect(readExifOrientation(createExifJpeg(orientation, true))).toEqual({
        orientation,
        status: "present",
      });
    },
  );

  it("reads big-endian TIFF", () => {
    expect(readExifOrientation(createExifJpeg(6, false))).toEqual({
      orientation: 6,
      status: "present",
    });
  });

  it("defaults a JPEG without EXIF to orientation 1", () => {
    expect(readExifOrientation(MINIMAL_JPEG_BYTES)).toEqual({
      orientation: 1,
      status: "missing",
    });
  });

  it("defaults non-JPEG content to orientation 1", () => {
    expect(readExifOrientation(MINIMAL_PNG_BYTES)).toEqual({
      orientation: 1,
      status: "missing",
    });
  });

  it("safely rejects truncated EXIF", () => {
    expect(readExifOrientation(createExifJpeg(6).subarray(0, 20))).toEqual({
      orientation: 1,
      status: "invalid",
    });
  });

  it("does not trust an out-of-bounds IFD offset", () => {
    const bytes = createExifJpeg(6);
    new DataView(bytes.buffer).setUint32(16, 0xfffffff0, true);
    expect(readExifOrientation(bytes)).toEqual({
      orientation: 1,
      status: "invalid",
    });
  });

  it("rejects an invalid orientation value", () => {
    const bytes = createExifJpeg(1);
    new DataView(bytes.buffer).setUint16(30, 9, true);
    expect(readExifOrientation(bytes)).toEqual({
      orientation: 1,
      status: "invalid",
    });
  });
});

describe("EXIF orientation pixel transforms", () => {
  const expected = new Map<ExifOrientation, number[][]>([
    [
      1,
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
    ],
    [
      2,
      [
        [2, 1],
        [4, 3],
        [6, 5],
      ],
    ],
    [
      3,
      [
        [6, 5],
        [4, 3],
        [2, 1],
      ],
    ],
    [
      4,
      [
        [5, 6],
        [3, 4],
        [1, 2],
      ],
    ],
    [
      5,
      [
        [1, 3, 5],
        [2, 4, 6],
      ],
    ],
    [
      6,
      [
        [5, 3, 1],
        [6, 4, 2],
      ],
    ],
    [
      7,
      [
        [6, 4, 2],
        [5, 3, 1],
      ],
    ],
    [
      8,
      [
        [2, 4, 6],
        [1, 3, 5],
      ],
    ],
  ]);

  it.each([1, 2, 3, 4, 5, 6, 7, 8] as const)(
    "applies orientation %s exactly",
    (orientation) => {
      const source = rgbaFromIds(2, 3);
      const original = new Uint8ClampedArray(source.data);
      expect(redChannelRows(applyExifOrientation(source, orientation))).toEqual(
        expected.get(orientation),
      );
      expect(source.data).toEqual(original);
    },
  );

  it.each([5, 6, 7, 8] as const)("swaps dimensions for %s", (orientation) => {
    expect(getOrientedDimensions(2, 3, orientation)).toEqual({
      width: 3,
      height: 2,
    });
  });
});
