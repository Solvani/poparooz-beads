import { describe, expect, it } from "vitest";

import {
  deterministicSerializationGate,
  exactByteIdentityGate,
  exactValueGate,
} from "./generator-quality-gates.ts";

describe("generator quality hard gates", () => {
  it("requires explicit-alpha results to remain byte-identical", () => {
    const baseline = new Uint8Array([0, 0, 0, 0, 12, 34, 56, 128]);

    expect(exactByteIdentityGate("explicit-alpha", baseline, baseline)).toEqual(
      {
        id: "explicit-alpha",
        status: "passed",
        actual: "byte-identical",
        expected: "byte-identical",
      },
    );
    expect(
      exactByteIdentityGate(
        "explicit-alpha",
        baseline,
        new Uint8Array([0, 0, 0, 0, 12, 34, 57, 128]),
      ).status,
    ).toBe("failed");
  });

  it("fails exact-value gates on any numeric drift", () => {
    expect(exactValueGate("component-count", 2, 2).status).toBe("passed");
    expect(exactValueGate("component-count", 3, 2).status).toBe("failed");
  });

  it("detects nondeterministic canonical serialization", () => {
    expect(
      deterministicSerializationGate('{"a":1}\n', '{"a":1}\n').status,
    ).toBe("passed");
    expect(deterministicSerializationGate('{"a":1}\n', '{"a":2}\n')).toEqual({
      id: "deterministic-repeated-result",
      status: "failed",
      actual: "different",
      expected: "byte-identical",
    });
  });
});
