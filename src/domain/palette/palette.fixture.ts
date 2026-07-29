import type { PaletteColor, PaletteDefinition } from "./palette.types";

export const TEST_FIXTURE_PALETTE_VERSION = "fixture-v2-not-production";

export const TEST_PLAIN_PALETTE_COLOR = {
  referenceSystem: "MARD",
  referenceCode: "TEST-REF-PLAIN",
  referenceName: "Fixture Internal Plain Name",
  referenceSeries: "Fixture Internal Series",
  displayCode: "POP-TEST-PLAIN",
  displayName: "Test Plain Color",
  hex: "#336699",
  rgb: [51, 102, 153],
  lab: [42, 1, -2],
  isActive: true,
  isSellable: true,
  isSpecialFinish: false,
  isAutoMatchEnabled: true,
  sortOrder: 1,
  sourceVersion: TEST_FIXTURE_PALETTE_VERSION,
} satisfies PaletteColor;

export const TEST_UNAVAILABLE_PALETTE_COLOR = {
  referenceSystem: "MARD",
  referenceCode: "TEST-REF-NOT-SELLABLE",
  referenceName: "Fixture Internal Unavailable Name",
  referenceSeries: "Fixture Internal Series",
  displayCode: "POP-TEST-NOT-SELLABLE",
  displayName: "Test Unavailable Color",
  hex: "#CC8844",
  rgb: [204, 136, 68],
  lab: [64, 18, 42],
  isActive: true,
  isSellable: false,
  isSpecialFinish: false,
  isAutoMatchEnabled: false,
  sortOrder: 2,
  sourceVersion: TEST_FIXTURE_PALETTE_VERSION,
} satisfies PaletteColor;

export const TEST_SPECIAL_PALETTE_COLOR = {
  referenceSystem: "MARD",
  referenceCode: "TEST-REF-SPECIAL",
  referenceName: "Fixture Internal Special Name",
  referenceSeries: "Fixture Internal Series",
  displayCode: "POP-TEST-SPECIAL",
  displayName: "Test Special-Finish Color",
  hex: "#00FF66",
  rgb: [0, 255, 102],
  lab: [88, -70, 50],
  isActive: true,
  isSellable: true,
  isSpecialFinish: true,
  finishType: "glow",
  isAutoMatchEnabled: false,
  sortOrder: 3,
  sourceVersion: TEST_FIXTURE_PALETTE_VERSION,
} satisfies PaletteColor;

export const TEST_PALETTE_DEFINITION = {
  id: "test-fixture-palette",
  referenceSystem: "MARD",
  displayBrand: "Poparooz",
  name: "Non-Production Test Fixture Palette",
  version: TEST_FIXTURE_PALETTE_VERSION,
  colorCount: 3,
  sourceType: "reference",
  colors: [
    TEST_PLAIN_PALETTE_COLOR,
    TEST_UNAVAILABLE_PALETTE_COLOR,
    TEST_SPECIAL_PALETTE_COLOR,
  ],
} satisfies PaletteDefinition;
