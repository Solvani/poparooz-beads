import { ColorMatchingError } from "./color-matching-errors";
import type { LabColor } from "./color.types";

export function validateLabColor(color: LabColor): void {
  if (typeof color !== "object" || color === null) {
    throwInvalidLab();
  }

  for (const channel of ["l", "a", "b"] as const) {
    const value = color[channel];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throwInvalidLab();
    }
  }

  if (color.l < 0 || color.l > 100) {
    throwInvalidLab();
  }
}

function throwInvalidLab(): never {
  throw new ColorMatchingError(
    "INVALID_LAB_COLOR",
    "Lab colors require finite channels and an L value between 0 and 100.",
  );
}
