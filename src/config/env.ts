export interface AppEnvironment {
  readonly shopUrl?: string;
  readonly beadsCollectionUrl?: string;
  readonly generatorPublicUrl?: string;
  readonly allowedParentOrigins: readonly string[];
}

export interface EnvironmentParseOptions {
  readonly production?: boolean;
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
  requireHttps = false,
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

  if (requireHttps && url.protocol !== "https:") {
    throw new EnvironmentConfigurationError(
      variableName,
      "expected an HTTPS URL in production",
    );
  }

  return url.href;
}

function parseAllowedParentOrigins(
  value: string | boolean | undefined,
  requireHttps = false,
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
        requireHttps,
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

export function parseEnvironment(
  source: EnvironmentSource,
  options: EnvironmentParseOptions = {},
): AppEnvironment {
  const production = options.production === true;
  const environment: AppEnvironment = {
    shopUrl: parseOptionalHttpUrl(
      source.VITE_SHOP_URL,
      "VITE_SHOP_URL",
      production,
    ),
    beadsCollectionUrl: parseOptionalHttpUrl(
      source.VITE_BEADS_COLLECTION_URL,
      "VITE_BEADS_COLLECTION_URL",
      production,
    ),
    generatorPublicUrl: parseOptionalHttpUrl(
      source.VITE_GENERATOR_PUBLIC_URL,
      "VITE_GENERATOR_PUBLIC_URL",
      production,
    ),
    allowedParentOrigins: parseAllowedParentOrigins(
      source.VITE_ALLOWED_PARENT_ORIGINS,
      production,
    ),
  };

  if (production) validateProductionEnvironment(environment);

  return environment;
}

function validateProductionEnvironment(environment: AppEnvironment): void {
  const requiredUrls = [
    ["VITE_SHOP_URL", environment.shopUrl],
    ["VITE_GENERATOR_PUBLIC_URL", environment.generatorPublicUrl],
  ] as const;

  for (const [variableName, value] of requiredUrls) {
    if (value === undefined) {
      throw new EnvironmentConfigurationError(
        variableName,
        "required in production",
      );
    }

    const url = new URL(value);
    if (url.href !== `${url.origin}/`) {
      throw new EnvironmentConfigurationError(
        variableName,
        "expected an origin without a path, query, or fragment",
      );
    }
  }

  if (environment.allowedParentOrigins.length !== 1) {
    throw new EnvironmentConfigurationError(
      "VITE_ALLOWED_PARENT_ORIGINS",
      "expected exactly one approved production parent origin",
    );
  }

  if (
    environment.allowedParentOrigins[0] !== new URL(environment.shopUrl!).origin
  ) {
    throw new EnvironmentConfigurationError(
      "VITE_ALLOWED_PARENT_ORIGINS",
      "expected the approved shop origin",
    );
  }
}

export const appEnvironment = parseEnvironment(import.meta.env, {
  production: import.meta.env.PROD,
});
