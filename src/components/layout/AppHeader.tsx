import poparoozLogo from "../../assets/branding/poparooz-logo.png";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__identity">
          <img className="app-header__logo" src={poparoozLogo} alt="Poparooz" />
        </div>
        <ol className="app-progress" aria-label="Pattern maker steps">
          {["Upload", "Settings", "Generate", "Pattern", "Results"].map(
            (step) => (
              <li key={step}>{step}</li>
            ),
          )}
        </ol>
        <p className="app-header__privacy">
          Your image is processed on this device and is not uploaded.
        </p>
      </div>
    </header>
  );
}
