import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { runPaletteValidationCli } from "./validate-palette.ts";

const fixturesDirectory = resolve(process.cwd(), "data-source", "fixtures");

function captureIo() {
  const logs: string[] = [];
  const errors: string[] = [];
  return {
    logs,
    errors,
    io: {
      log: (message: string) => logs.push(message),
      error: (message: string) => errors.push(message),
    },
  };
}

describe("palette validation CLI", () => {
  it("returns zero and summarizes a valid fixture", async () => {
    const output = captureIo();
    const exitCode = await runPaletteValidationCli(
      [
        "--csv",
        `${fixturesDirectory}/valid-test-palette.csv`,
        "--metadata",
        `${fixturesDirectory}/test-palette-metadata.json`,
      ],
      output.io,
    );

    expect(exitCode).toBe(0);
    expect(output.logs.join("\n")).toContain("3 color rows");
    expect(output.logs.join("\n")).toContain("validation passed");
  });

  it("returns non-zero and structured issues for an invalid fixture", async () => {
    const output = captureIo();
    const exitCode = await runPaletteValidationCli(
      [
        "--csv",
        `${fixturesDirectory}/invalid-test-color-values.csv`,
        "--metadata",
        `${fixturesDirectory}/test-palette-metadata.json`,
      ],
      output.io,
    );

    expect(exitCode).toBe(1);
    expect(output.errors.join("\n")).toContain("[INVALID_NUMBER]");
    expect(output.errors.join("\n")).not.toContain("Internal Bad One");
  });

  it("returns non-zero when an input file does not exist", async () => {
    const output = captureIo();
    const exitCode = await runPaletteValidationCli(
      [
        "--csv",
        `${fixturesDirectory}/missing.csv`,
        "--metadata",
        `${fixturesDirectory}/test-palette-metadata.json`,
      ],
      output.io,
    );

    expect(exitCode).toBe(2);
    expect(output.errors.join("\n")).toContain("validation failed");
  });

  it("returns non-zero when required arguments are missing", async () => {
    const output = captureIo();
    const exitCode = await runPaletteValidationCli([], output.io);

    expect(exitCode).toBe(2);
    expect(output.errors.join("\n")).toContain("both --csv and --metadata");
  });
});
