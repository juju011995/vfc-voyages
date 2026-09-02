import { useState } from "react";
import { AppShell, type TabId } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { CartePage } from "./pages/CartePage";
import { BudgetPage } from "./pages/BudgetPage";
import { TachesPage } from "./pages/TachesPage";
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
        <Dashboard
          onOpenCarte={() => setActiveTab("carte")}
          onOpenBudget={() => setActiveTab("budget")}
          onOpenTaches={() => setActiveTab("taches")}
        />
      )}
      {activeTab === "carte" && <CartePage />}
      {activeTab === "budget" && <BudgetPage />}
      {activeTab === "taches" && <TachesPage />}
      {activeTab === "plus" && <ComingSoon moduleName="Loki, Statistiques & Paramètres" />}
    </AppShell>
  );
}

export default App;
