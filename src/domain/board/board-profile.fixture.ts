import type { BoardProfile } from "./board-profile.types";

export const TEST_BOARD_PROFILE = {
  id: "test-fixture-board",
  name: "Non-Production Test Fixture Board",
  columns: 10,
  rows: 10,
  beadSizeMm: 5,
  isDefault: false,
  isActive: true,
} satisfies BoardProfile;
