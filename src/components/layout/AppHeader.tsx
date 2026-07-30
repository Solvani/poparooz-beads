export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div
          className="app-header__identity"
          aria-label="Poparooz Pattern Maker"
        >
          <span className="app-header__wordmark">Poparooz</span>
          <span className="app-header__product">Pattern Maker</span>
        </div>
        <p className="app-header__privacy">
          Your image is processed on this device and is not uploaded.
        </p>
      </div>
    </header>
  );
}
