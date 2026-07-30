import { AppHeader } from "../components/layout/AppHeader";
import { GeneratorWorkspaceShell } from "../components/layout/GeneratorWorkspaceShell";

export function App() {
  return (
    <div className="app-root">
      <AppHeader />
      <div className="page-frame">
        <GeneratorWorkspaceShell />
      </div>
    </div>
  );
}
