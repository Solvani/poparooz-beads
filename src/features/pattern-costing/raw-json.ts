import { fail } from "./pattern-costing-error";

const WHITESPACE = new Set([" ", "\t", "\r", "\n"]);

export function parseAuthoritativeJsonBytes(bytes: Uint8Array): unknown {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    fail("REJECT_RAW_JSON_MALFORMED_OR_INVALID_UTF8", error);
  }
  try {
    new RawJsonGate(text).validate();
  } catch (error) {
    if (error instanceof DuplicateKeyError)
      fail("REJECT_RAW_JSON_DUPLICATE_KEY", error);
    if (error instanceof IJsonError) fail("REJECT_I_JSON_VIOLATION", error);
    fail("REJECT_RAW_JSON_MALFORMED_OR_INVALID_UTF8", error);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    fail("REJECT_RAW_JSON_MALFORMED_OR_INVALID_UTF8", error);
  }
  assertRecursivelyValidIJson(parsed);
  return parsed;
}

export function assertRecursivelyValidIJson(value: unknown): void {
  const seen = new Set<object>();
  const visit = (current: unknown): void => {
    if (current === null || typeof current === "boolean") return;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) fail("REJECT_I_JSON_VIOLATION");
      return;
    }
    if (typeof current === "string") {
      assertPairedSurrogates(current);
      return;
    }
    if (typeof current !== "object" || ArrayBuffer.isView(current))
      fail("REJECT_I_JSON_VIOLATION");
    if (seen.has(current)) fail("REJECT_I_JSON_VIOLATION");
    seen.add(current);
    if (Array.isArray(current)) {
      current.forEach(visit);
    } else {
      for (const [key, child] of Object.entries(current)) {
        assertPairedSurrogates(key);
        visit(child);
      }
    }
    seen.delete(current);
  };
  visit(value);
}

function assertPairedSurrogates(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const low = value.charCodeAt(index + 1);
      if (!(low >= 0xdc00 && low <= 0xdfff)) fail("REJECT_I_JSON_VIOLATION");
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      fail("REJECT_I_JSON_VIOLATION");
    }
  }
}

class DuplicateKeyError extends Error {}
class IJsonError extends Error {}

class RawJsonGate {
  private index = 0;

  constructor(private readonly text: string) {}

  validate(): void {
    this.skipWhitespace();
    this.value();
    this.skipWhitespace();
    if (this.index !== this.text.length) throw new SyntaxError();
  }

  private value(): void {
    const char = this.text[this.index];
    if (char === "{") return this.object();
    if (char === "[") return this.array();
    if (char === '"') {
      this.string();
      return;
    }
    if (char === "t") return this.literal("true");
    if (char === "f") return this.literal("false");
    if (char === "n") return this.literal("null");
    if (char === "-" || (char !== undefined && /[0-9]/.test(char)))
      return this.number();
    throw new SyntaxError();
  }

  private object(): void {
    this.index += 1;
    this.skipWhitespace();
    if (this.consume("}")) return;
    const names = new Set<string>();
    for (;;) {
      if (this.text[this.index] !== '"') throw new SyntaxError();
      const name = this.string();
      if (names.has(name)) throw new DuplicateKeyError();
      names.add(name);
      this.skipWhitespace();
      this.expect(":");
      this.skipWhitespace();
      this.value();
      this.skipWhitespace();
      if (this.consume("}")) return;
      this.expect(",");
      this.skipWhitespace();
    }
  }

  private array(): void {
    this.index += 1;
    this.skipWhitespace();
    if (this.consume("]")) return;
    for (;;) {
      this.value();
      this.skipWhitespace();
      if (this.consume("]")) return;
      this.expect(",");
      this.skipWhitespace();
    }
  }

  private string(): string {
    this.expect('"');
    let output = "";
    for (;;) {
      const char = this.text[this.index];
      if (char === undefined) throw new SyntaxError();
      if (char === '"') {
        this.index += 1;
        return output;
      }
      if (char === "\\") {
        this.index += 1;
        output += this.escape();
        continue;
      }
      const code = char.charCodeAt(0);
      if (code < 0x20) throw new SyntaxError();
      if (code >= 0xd800 && code <= 0xdbff) {
        const low = this.text.charCodeAt(this.index + 1);
        if (!(low >= 0xdc00 && low <= 0xdfff)) throw new IJsonError();
        output += char + this.text[this.index + 1];
        this.index += 2;
        continue;
      }
      if (code >= 0xdc00 && code <= 0xdfff) throw new IJsonError();
      output += char;
      this.index += 1;
    }
  }

  private escape(): string {
    const char = this.text[this.index];
    this.index += 1;
    const simple: Record<string, string> = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    if (char !== undefined && char in simple) return simple[char]!;
    if (char !== "u") throw new SyntaxError();
    const high = this.hexCodeUnit();
    if (high >= 0xd800 && high <= 0xdbff) {
      if (this.text.slice(this.index, this.index + 2) !== "\\u")
        throw new IJsonError();
      this.index += 2;
      const low = this.hexCodeUnit();
      if (!(low >= 0xdc00 && low <= 0xdfff)) throw new IJsonError();
      return String.fromCharCode(high, low);
    }
    if (high >= 0xdc00 && high <= 0xdfff) throw new IJsonError();
    return String.fromCharCode(high);
  }

  private hexCodeUnit(): number {
    const hex = this.text.slice(this.index, this.index + 4);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new SyntaxError();
    this.index += 4;
    return Number.parseInt(hex, 16);
  }

  private number(): void {
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(
      this.text.slice(this.index),
    );
    if (match === null) throw new SyntaxError();
    this.index += match[0].length;
  }

  private literal(value: string): void {
    if (this.text.slice(this.index, this.index + value.length) !== value)
      throw new SyntaxError();
    this.index += value.length;
  }

  private skipWhitespace(): void {
    while (WHITESPACE.has(this.text[this.index] ?? "")) this.index += 1;
  }

  private consume(value: string): boolean {
    if (this.text[this.index] !== value) return false;
    this.index += 1;
    return true;
  }

  private expect(value: string): void {
    if (!this.consume(value)) throw new SyntaxError();
  }
}
