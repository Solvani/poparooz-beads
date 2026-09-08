import {
  resolveApplicationRoute,
  type ApplicationRoute,
} from "./application-route";

export interface ApplicationRouteStartupDependencies {
  readonly pathname: string;
  readonly startGenerator: () => void;
  readonly renderMarketingWithdrawal: () => void;
}

export function startApplicationRoute(
  dependencies: ApplicationRouteStartupDependencies,
): ApplicationRoute {
  const route = resolveApplicationRoute(dependencies.pathname);

  if (route === "marketing-withdrawal") {
    dependencies.renderMarketingWithdrawal();
    return route;
  }

  dependencies.startGenerator();
  return route;
}
