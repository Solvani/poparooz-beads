import type { EmailGateIssueProofProvider } from "../../email-gate/email-gate-capability";
import type { EmailGateBrowserClient } from "../../email-gate/email-gate-client";

export interface MarketingWithdrawalVerificationCapability {
  readonly client: EmailGateBrowserClient;
  readonly issueProofProvider: EmailGateIssueProofProvider;
}
