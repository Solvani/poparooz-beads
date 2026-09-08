export type ApplicationRoute = "generator" | "marketing-withdrawal";

export function resolveApplicationRoute(pathname: string): ApplicationRoute {
  return pathname === "/unsubscribe" || pathname === "/unsubscribe/"
    ? "marketing-withdrawal"
    : "generator";
}
