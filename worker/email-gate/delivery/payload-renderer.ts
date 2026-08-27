export interface DeliveryPayload {
  readonly from: string;
  readonly replyTo: string;
  readonly to: readonly [string];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

export interface DeliveryPayloadRenderer {
  readonly version: number;
  render(
    input: Readonly<{ normalizedEmail: string; otp: string }>,
  ): DeliveryPayload;
}

export interface DeliveryPayloadRendererRegistry {
  readonly activeVersion: number;
  getRenderer(version: number): DeliveryPayloadRenderer | null;
}

export function createDeliveryPayloadRendererRegistry(
  activeVersion: number,
  renderers: readonly DeliveryPayloadRenderer[],
): DeliveryPayloadRendererRegistry {
  const byVersion = new Map(
    renderers.map((renderer) => [renderer.version, renderer] as const),
  );
  return Object.freeze({
    activeVersion,
    getRenderer(version: number): DeliveryPayloadRenderer | null {
      return byVersion.get(version) ?? null;
    },
  });
}

export function createTestFixtureRenderer(
  version: number,
): DeliveryPayloadRenderer {
  return Object.freeze({
    version,
    render({
      normalizedEmail,
      otp,
    }: Readonly<{ normalizedEmail: string; otp: string }>): DeliveryPayload {
      return Object.freeze({
        from: "Poparooz Test <test@notify.example.invalid>",
        replyTo: "test-replies@example.invalid",
        to: Object.freeze([normalizedEmail]) as readonly [string],
        subject: "Poparooz test verification fixture",
        text: `Test-only verification code: ${otp}`,
      });
    },
  });
}
