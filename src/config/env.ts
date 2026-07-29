export interface AppEnvironment {
  readonly shopUrl?: string;
  readonly beadsCollectionUrl?: string;
  readonly generatorPublicUrl?: string;
  readonly allowedParentOrigins: readonly string[];
}

type EnvironmentSource = Readonly<
  Partial<Record<keyof ImportMetaEnv, string | boolean | undefined>>
>;

export class EnvironmentConfigurationError extends Error {
  public constructor(variableName: string, reason: string) {
    super(`Invalid ${variableName}: ${reason}`);
    this.name = "EnvironmentConfigurationError";
  }
}

function parseOptionalHttpUrl(
  value: string | boolean | undefined,
  variableName: string,
): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new EnvironmentConfigurationError(variableName, "expected a URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new EnvironmentConfigurationError(
      variableName,
      "expected an HTTP or HTTPS URL",
    );
  }

  return url.href;
}

function parseAllowedParentOrigins(
  value: string | boolean | undefined,
): readonly string[] {
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  const origins = value
    .split(",")
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate !== "")
    .map((candidate) => {
      const parsed = parseOptionalHttpUrl(
        candidate,
        "VITE_ALLOWED_PARENT_ORIGINS",
      );

      if (parsed === undefined) {
        throw new EnvironmentConfigurationError(
          "VITE_ALLOWED_PARENT_ORIGINS",
          "expected an origin",
        );
      }

      const url = new URL(parsed);

      if (
        url.href !== `${url.origin}/` ||
        url.username !== "" ||
        url.password !== ""
      ) {
        throw new EnvironmentConfigurationError(
          "VITE_ALLOWED_PARENT_ORIGINS",
          `"${candidate}" must be an origin without a path, query, or fragment`,
        );
      }

      return url.origin;
    });

  return [...new Set(origins)];
}

export function parseEnvironment(source: EnvironmentSource): AppEnvironment {
  return {
    shopUrl: parseOptionalHttpUrl(source.VITE_SHOP_URL, "VITE_SHOP_URL"),
    beadsCollectionUrl: parseOptionalHttpUrl(
      source.VITE_BEADS_COLLECTION_URL,
      "VITE_BEADS_COLLECTION_URL",
    ),
    generatorPublicUrl: parseOptionalHttpUrl(
      source.VITE_GENERATOR_PUBLIC_URL,
      "VITE_GENERATOR_PUBLIC_URL",
    ),
    allowedParentOrigins: parseAllowedParentOrigins(
      source.VITE_ALLOWED_PARENT_ORIGINS,
    ),
  };
}

export const appEnvironment = parseEnvironment(import.meta.env);
