export interface ProcessingPolicySnapshot {
  readonly policyId: "poparooz-processing-policy";
  readonly policyVersion: "1.1.0";
  readonly imageNormalization: {
    readonly preserveAspectRatio: true;
    readonly fit: "contain";
    readonly allowUpscale: false;
    readonly transparentOccupancyThresholdByte: 32;
  };
  readonly quantization: {
    readonly alphaThresholdByte: 16;
    readonly maxColors: {
      readonly minimum: 2;
      readonly default: 32;
      readonly maximum: 64;
    };
  };
}

export interface ProcessingPolicyProvider {
  getSnapshot(): ProcessingPolicySnapshot;
}
