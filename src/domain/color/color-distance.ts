import { ColorMatchingError } from "./color-matching-errors";
import { validateLabColor } from "./lab-validation";
import type { LabColor } from "./color.types";

const POW_25_7 = 25 ** 7;

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function normalizeDegrees(degrees: number): number {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function hueDegrees(aPrime: number, b: number): number {
  if (aPrime === 0 && b === 0) {
    return 0;
  }
  return normalizeDegrees(radiansToDegrees(Math.atan2(b, aPrime)));
}

function chromaCorrectionRatio(chroma: number): number {
  if (chroma === 0) {
    return 0;
  }
  return 1 / (1 + POW_25_7 / chroma ** 7);
}

function ensureDistance(distance: number): number {
  if (!Number.isFinite(distance) || distance < 0) {
    throw new ColorMatchingError(
      "NON_FINITE_COLOR_DISTANCE",
      "The color distance calculation produced an invalid result.",
    );
  }
  return Object.is(distance, -0) ? 0 : distance;
}

export function deltaE76(left: LabColor, right: LabColor): number {
  validateLabColor(left);
  validateLabColor(right);
  return ensureDistance(
    Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b),
  );
}

export function deltaE2000(left: LabColor, right: LabColor): number {
  validateLabColor(left);
  validateLabColor(right);

  if (left.l === right.l && left.a === right.a && left.b === right.b) {
    return 0;
  }

  const c1 = Math.hypot(left.a, left.b);
  const c2 = Math.hypot(right.a, right.b);
  const meanC = (c1 + c2) / 2;
  const g = (1 - Math.sqrt(chromaCorrectionRatio(meanC))) / 2;

  const a1Prime = (1 + g) * left.a;
  const a2Prime = (1 + g) * right.a;
  const c1Prime = Math.hypot(a1Prime, left.b);
  const c2Prime = Math.hypot(a2Prime, right.b);
  const h1Prime = hueDegrees(a1Prime, left.b);
  const h2Prime = hueDegrees(a2Prime, right.b);

  const deltaLPrime = right.l - left.l;
  const deltaCPrime = c2Prime - c1Prime;
  const hueDifference = h2Prime - h1Prime;
  const deltaHuePrime =
    c1Prime * c2Prime === 0
      ? 0
      : Math.abs(hueDifference) <= 180
        ? hueDifference
        : hueDifference > 180
          ? hueDifference - 360
          : hueDifference + 360;
  const deltaHPrime =
    2 *
    Math.sqrt(c1Prime * c2Prime) *
    Math.sin(degreesToRadians(deltaHuePrime / 2));

  const meanLPrime = (left.l + right.l) / 2;
  const meanCPrime = (c1Prime + c2Prime) / 2;
  const hueSum = h1Prime + h2Prime;
  const meanHPrime =
    c1Prime * c2Prime === 0
      ? hueSum
      : Math.abs(hueDifference) <= 180
        ? hueSum / 2
        : hueSum < 360
          ? (hueSum + 360) / 2
          : (hueSum - 360) / 2;

  const t =
    1 -
    0.17 * Math.cos(degreesToRadians(meanHPrime - 30)) +
    0.24 * Math.cos(degreesToRadians(2 * meanHPrime)) +
    0.32 * Math.cos(degreesToRadians(3 * meanHPrime + 6)) -
    0.2 * Math.cos(degreesToRadians(4 * meanHPrime - 63));
  const deltaTheta = 30 * Math.exp(-(((meanHPrime - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(chromaCorrectionRatio(meanCPrime));
  const lightnessOffset = meanLPrime - 50;
  const sL =
    1 + (0.015 * lightnessOffset ** 2) / Math.sqrt(20 + lightnessOffset ** 2);
  const sC = 1 + 0.045 * meanCPrime;
  const sH = 1 + 0.015 * meanCPrime * t;
  const rT = -Math.sin(degreesToRadians(2 * deltaTheta)) * rC;

  const lightnessTerm = deltaLPrime / sL;
  const chromaTerm = deltaCPrime / sC;
  const hueTerm = deltaHPrime / sH;
  const squaredDistance =
    lightnessTerm ** 2 +
    chromaTerm ** 2 +
    hueTerm ** 2 +
    rT * chromaTerm * hueTerm;

  if (!Number.isFinite(squaredDistance) || squaredDistance < 0) {
    throw new ColorMatchingError(
      "NON_FINITE_COLOR_DISTANCE",
      "The color distance calculation produced an invalid result.",
    );
  }

  return ensureDistance(Math.sqrt(squaredDistance));
}
