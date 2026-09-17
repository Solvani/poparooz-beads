import canonicalize from "canonicalize";

import { fail } from "./pattern-costing-error";
import { assertRecursivelyValidIJson } from "./raw-json";
import type { Sha256Digest } from "./pattern-costing.types";

const encoder = new TextEncoder();

export function canonicalJson(value: unknown): string {
  assertRecursivelyValidIJson(value);
  const serialized = canonicalize(value);
  if (serialized === undefined) fail("REJECT_I_JSON_VIOLATION");
  return serialized;
}

export async function domainSeparatedDigest(
  domain: string,
  value: unknown,
): Promise<Sha256Digest> {
  return sha256Digest(encoder.encode(`${domain}\n${canonicalJson(value)}`));
}

export async function sha256Digest(bytes: Uint8Array): Promise<Sha256Digest> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    Uint8Array.from(bytes).buffer,
  );
  const hex = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `sha256:${hex}`;
}

export function utf8ByteCompare(left: string, right: string): number {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = a[index]! - b[index]!;
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}
