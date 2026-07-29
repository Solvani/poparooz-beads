import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { importPaletteFromText } from "./palette-importer.ts";

interface CliIo {
  error(message: string): void;
  log(message: string): void;
}

export async function runPaletteValidationCli(
  args: string[],
  io: CliIo = console,
): Promise<number> {
  const paths = parseArguments(args);
  if (typeof paths === "string") {
    io.error(`Palette validation failed: ${paths}`);
    io.error(
      "Usage: npm run palette:validate -- --csv <path> --metadata <path>",
    );
    return 2;
  }

  let csvText: string;
  let metadataText: string;
  try {
    [csvText, metadataText] = await Promise.all([
      readFile(paths.csv, "utf8"),
      readFile(paths.metadata, "utf8"),
    ]);
  } catch (error) {
    io.error(`Palette validation failed: ${safeErrorMessage(error)}`);
    return 2;
  }

  let metadata: unknown;
  try {
    metadata = JSON.parse(metadataText) as unknown;
  } catch (error) {
    io.error(
      `Palette validation failed with 1 issue(s).\n- [METADATA_VALIDATION_ERROR] ${safeErrorMessage(error)}`,
    );
    return 1;
  }

  const result = importPaletteFromText(csvText, metadata);
  if (!result.success) {
    io.error(
      `Palette validation failed with ${result.issues.length} issue(s).`,
    );
    for (const issue of result.issues) {
      const location = [
        issue.row === undefined ? undefined : `row ${issue.row}`,
        issue.column === undefined ? undefined : `column ${issue.column}`,
      ]
        .filter(Boolean)
        .join(", ");
      io.error(
        `- [${issue.code}]${location === "" ? "" : ` ${location}:`} ${issue.message}`,
      );
    }
    return 1;
  }

  io.log(
    `Palette validation passed: ${paths.csv} (${result.palette.colorCount} color rows; metadata ${paths.metadata}).`,
  );
  return 0;
}

function parseArguments(
  args: string[],
): { csv: string; metadata: string } | string {
  const allowed = new Set(["--csv", "--metadata"]);
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (
      flag === undefined ||
      !allowed.has(flag) ||
      value === undefined ||
      value.startsWith("--")
    ) {
      return "arguments must be --csv <path> and --metadata <path> only.";
    }
    if (values.has(flag)) return `duplicate argument ${flag}.`;
    values.set(flag, value);
  }

  if (values.size !== 2 || !values.has("--csv") || !values.has("--metadata")) {
    return "both --csv and --metadata are required.";
  }

  return { csv: values.get("--csv")!, metadata: values.get("--metadata")! };
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown file or JSON error.";
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  import.meta.url === pathToFileURL(invokedPath).href
) {
  process.exitCode = await runPaletteValidationCli(process.argv.slice(2));
}
