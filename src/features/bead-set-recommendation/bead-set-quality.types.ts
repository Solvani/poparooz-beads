import type { ImageBackground } from "../../domain/image/image.types";
import type { PublishedColorSetProfileId } from "../../runtime/color-set/color-set.types";

export type BeadSetQualityProfileSize = 24 | 48 | 72 | 120 | 168 | 221;

export interface BeadSetCandidateQuality {
  readonly profileId: PublishedColorSetProfileId;
  readonly profileSize: BeadSetQualityProfileSize;
  readonly usedColorCount: number;
  readonly totalWeightedPixelCount: number;
  readonly weightedMeanPaletteDeltaE00: number;
  readonly weightedP95PaletteDeltaE00: number;
  readonly maximumPaletteDeltaE00: number;
  readonly meanDeltaVs221: number;
  readonly p95DeltaVs221: number;
}

export interface BeadSetQualityEvaluation {
  readonly width: number;
  readonly height: number;
  readonly quantizedColorCount: number;
  readonly occupiedPixelCount: number;
  readonly transparentPixelCount: number;
  readonly candidates: readonly BeadSetCandidateQuality[];
}

export interface BeadSetQualityEvaluationInput {
  readonly file: Blob;
  readonly width: number;
  readonly height: number;
  readonly maxColors: number;
  readonly background: ImageBackground;
}

export interface BeadSetQualityService {
  evaluate(
    input: BeadSetQualityEvaluationInput,
    signal: AbortSignal,
  ): Promise<BeadSetQualityEvaluation>;
}
