export const SRGB_TO_XYZ_D65_MATRIX = Object.freeze([
  Object.freeze([0.4124564, 0.3575761, 0.1804375] as const),
  Object.freeze([0.2126729, 0.7151522, 0.072175] as const),
  Object.freeze([0.0193339, 0.119192, 0.9503041] as const),
] as const);

export const D65_2_DEGREE_WHITE_POINT = Object.freeze({
  x: 0.95047,
  y: 1,
  z: 1.08883,
} as const);

export const CIELAB_EPSILON = 216 / 24389;
export const CIELAB_KAPPA = 24389 / 27;

export const SRGB_LINEAR_THRESHOLD = 0.04045;
export const SRGB_LINEAR_DIVISOR = 12.92;
