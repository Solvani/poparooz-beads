import { describe, expect, it } from "vitest";

import {
  computeOccupancyMetrics,
  occupiedBoundingBox,
} from "./generator-quality-metrics.ts";

describe("generator quality occupancy and structure metrics", () => {
  it("reports TP, false background, lost subject, box, singleton, and alpha difference", () => {
    const reference = Uint8Array.from([1, 1, 0, 0, 1, 0, 0, 0, 0]);
    const candidate = Uint8Array.from([1, 0, 1, 0, 1, 0, 0, 0, 1]);
    const metrics = computeOccupancyMetrics(
      candidate,
      reference,
      3,
      3,
      Uint8Array.from(candidate, (value) => value * 255),
      Uint8Array.from(reference, (value) => value * 255),
    );

    expect(metrics).toMatchObject({
      occupiedTruePositive: 2,
      falseBackgroundOccupied: 2,
      lostSubject: 1,
      candidateOnlyCount: 2,
      referenceOnlyCount: 1,
      occupancyDisagreementCount: 3,
      singletonCount: 4,
      beadCountDelta: 1,
    });
    expect(metrics.coverageWeightedAlphaAbsoluteDifference).toBeCloseTo(1 / 3);
    expect(metrics.occupiedBoundingBox).toEqual({
      minX: 0,
      minY: 0,
      maxX: 2,
      maxY: 2,
      width: 3,
      height: 3,
    });
  });

  it("detects component splits and merges deterministically", () => {
    const oneLine = Uint8Array.from([1, 1, 1]);
    const split = Uint8Array.from([1, 0, 1]);
    expect(computeOccupancyMetrics(split, oneLine, 3, 1)).toMatchObject({
      splitComponentCount: 1,
      deletedComponentCount: 0,
      endpointLossCount: 0,
    });

    const twoComponents = Uint8Array.from([1, 0, 1]);
    const bridge = Uint8Array.from([1, 1, 1]);
    expect(computeOccupancyMetrics(bridge, twoComponents, 3, 1)).toMatchObject({
      mergedComponentCount: 1,
    });
  });

  it("reports endpoint loss and validates dimensions", () => {
    const reference = Uint8Array.from([1, 1, 1, 1]);
    const candidate = Uint8Array.from([0, 1, 1, 1]);
    expect(computeOccupancyMetrics(candidate, reference, 4, 1)).toMatchObject({
      referenceEndpointCount: 2,
      retainedEndpointCount: 1,
      endpointLossCount: 1,
    });
    expect(() => occupiedBoundingBox(new Uint8Array(3), 2, 2)).toThrow();
  });
});
