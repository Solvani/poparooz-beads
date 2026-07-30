export interface PatternActionCapabilities {
  readonly downloadPattern: boolean;
  readonly getBeads: boolean;
}

export type PatternActionResultScope =
  "none" | "current-result" | "previous-result";

export interface PatternActionState {
  readonly hasResult: boolean;
  readonly resultIdentity: number | null;
  readonly resultScope: PatternActionResultScope;
  readonly downloadEnabled: boolean;
  readonly getBeadsEnabled: boolean;
  readonly availabilityMessage: string;
  readonly scopeMessage: string | null;
}
