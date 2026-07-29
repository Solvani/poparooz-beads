import type { PaletteColor, PaletteDefinition } from "./palette.types";

export const TEST_FIXTURE_PALETTE_VERSION = "fixture-v1-not-production";

export const TEST_PLAIN_PALETTE_COLOR = {
  brand: "MARD",
  code: "FIXTURE-PLAIN",
  name: "Fixture Plain Color",
  series: "Test Fixture Series",
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
  brand: "MARD",
  code: "FIXTURE-NOT-SELLABLE",
  name: "Fixture Unavailable Color",
  series: "Test Fixture Series",
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
  brand: "MARD",
  code: "FIXTURE-SPECIAL",
  name: "Fixture Special-Finish Color",
  series: "Test Fixture Series",
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
  brand: "MARD",
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
