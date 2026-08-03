export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".tsx")
    ) {
      try {
        return await nextResolve(`${specifier}.ts`, context);
      } catch {
        // Preserve the original resolution failure below.
      }
    }
    throw error;
  }
}
