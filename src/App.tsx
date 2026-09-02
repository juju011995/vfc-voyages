import { useState } from "react";
import { AppShell, type TabId } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { CartePage } from "./pages/CartePage";
import { ComingSoon } from "./pages/ComingSoon";

const TAB_TITLES: Record<TabId, string> = {
  accueil: "Bonjour !",
  carte: "Carte",
  budget: "Budget",
  taches: "Tâches",
  plus: "Plus",
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("accueil");

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={TAB_TITLES[activeTab]}
    >
      {activeTab === "accueil" && (
        <Dashboard onOpenCarte={() => setActiveTab("carte")} />
      )}
      {activeTab === "carte" && <CartePage />}
      {activeTab === "budget" && <ComingSoon moduleName="Budget" />}
      {activeTab === "taches" && <ComingSoon moduleName="Tâches" />}
      {activeTab === "plus" && <ComingSoon moduleName="Loki, Statistiques & Paramètres" />}
    </AppShell>
  );
}

export default App;
