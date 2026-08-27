export interface D1ResultPort<Row = Record<string, unknown>> {
  readonly success: boolean;
  readonly meta: Readonly<{ changes?: number }>;
  readonly results?: readonly Row[];
}

export interface D1PreparedStatementPort {
  bind(...values: readonly unknown[]): D1PreparedStatementPort;
  first<Row = Record<string, unknown>>(column?: string): Promise<Row | null>;
  all<Row = Record<string, unknown>>(): Promise<
    Readonly<{ success: boolean; results: readonly Row[] }>
  >;
  run<Row = Record<string, unknown>>(): Promise<D1ResultPort<Row>>;
}

export interface D1DatabasePort {
  prepare(query: string): D1PreparedStatementPort;
  batch<Row = Record<string, unknown>>(
    statements: readonly D1PreparedStatementPort[],
  ): Promise<readonly D1ResultPort<Row>[]>;
  exec(query: string): Promise<Readonly<{ count: number; duration: number }>>;
}

export interface EmailGateRuntimeBindings {
  readonly EMAIL_GATE_DB: D1DatabasePort;
  readonly RESEND_API_KEY: string;
  readonly TURNSTILE_SECRET: string;
  readonly OTP_DERIVATION_KEY: string;
}

export interface EmailGateScheduledController {
  readonly scheduledTime: number;
}

export interface EmailGateExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export type FetchPort = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
