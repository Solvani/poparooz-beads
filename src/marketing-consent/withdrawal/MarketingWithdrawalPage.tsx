import poparoozLogo from "../../assets/branding/poparooz-logo.png";
import type { MarketingWithdrawalAvailability } from "./marketing-withdrawal-availability";
import "./marketing-withdrawal.css";

export interface MarketingWithdrawalPageProps {
  readonly availability: MarketingWithdrawalAvailability;
}

export function MarketingWithdrawalPage({
  availability,
}: MarketingWithdrawalPageProps) {
  return (
    <main
      className="marketing-withdrawal-page"
      data-foundation-enabled={availability.enabled ? "true" : "false"}
      data-feature-state={availability.state}
    >
      <section
        className="marketing-withdrawal-card"
        aria-labelledby="marketing-withdrawal-heading"
      >
        <img
          className="marketing-withdrawal-logo"
          src={poparoozLogo}
          alt="Poparooz"
        />
        <p className="marketing-withdrawal-eyebrow">Email preferences</p>
        <h1 id="marketing-withdrawal-heading">
          Marketing preferences are temporarily unavailable.
        </h1>
        <p className="marketing-withdrawal-message" role="status">
          Please try again later. Your existing email preferences have not been
          changed.
        </p>
        <p className="marketing-withdrawal-privacy">No account. No password.</p>
        <a className="marketing-withdrawal-home" href="/">
          Return to Pattern Maker
        </a>
      </section>
    </main>
  );
}
