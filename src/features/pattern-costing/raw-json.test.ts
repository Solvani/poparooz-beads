import { describe, expect, it } from "vitest";

import { PatternCostingError } from "./pattern-costing-error";
import { parseAuthoritativeJsonBytes } from "./raw-json";

const bytes = (value: string) => new TextEncoder().encode(value);

describe("RawJsonDuplicateKeyGateV1", () => {
  it.each([
    '{"a":1,"a":2}',
    '{"a":1,"\\u0061":2}',
    '{"x":{"a":1,"a":2}}',
    '{"p00":0,"target":1,"target":2}',
  ])("rejects duplicate decoded names before JSON.parse", (raw) => {
    expect(() => parseAuthoritativeJsonBytes(bytes(raw))).toThrowError(
      expect.objectContaining<Partial<PatternCostingError>>({
        code: "REJECT_RAW_JSON_DUPLICATE_KEY",
      }),
    );
  });

  it.each(['{"a":1', '{"v":"\\ud800"}'])(
    "rejects malformed JSON or I-JSON",
    (raw) => {
      expect(() => parseAuthoritativeJsonBytes(bytes(raw))).toThrow(
        PatternCostingError,
      );
    },
  );

  it("rejects malformed UTF-8", () => {
    expect(() =>
      parseAuthoritativeJsonBytes(
        Uint8Array.of(0x7b, 0x22, 0x61, 0x22, 0x3a, 0xff, 0x7d),
      ),
    ).toThrowError(
      expect.objectContaining<Partial<PatternCostingError>>({
        code: "REJECT_RAW_JSON_MALFORMED_OR_INVALID_UTF8",
      }),
    );
  });

  it.each([
    '{"a":1,"b":2}',
    '{"x":{"a":1},"y":{"a":2}}',
    '[{"a":1},{"a":2}]',
    "{}",
    '{"a":1,"\\u0062":2}',
    '{"é":1}',
    '{"Å":1,"A\\u030a":2}',
    '{"v":"\\ud83d\\ude00"}',
  ])("accepts the frozen positive raw vector", (raw) => {
    expect(() => parseAuthoritativeJsonBytes(bytes(raw))).not.toThrow();
  });
});
