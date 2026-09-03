import { useState, type ReactNode } from "react";
import { AppShell, type TabId } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { CartePage } from "./pages/CartePage";
import { BudgetPage } from "./pages/BudgetPage";
import { TachesPage } from "./pages/TachesPage";
import { MaterielPage } from "./pages/MaterielPage";
import { PlusPage } from "./pages/PlusPage";
import { IconHome, IconVan, IconWallet, IconChecklist, IconCrate, IconDots } from "./components/icons/Icons";

const TAB_TITLES: Record<TabId, string> = {
  accueil: "Bonjour !",
  carte: "Carte",
  budget: "Budget",
  taches: "Tâches",
  materiel: "Matériel",
  plus: "Plus",
};

const TAB_ICONS: Record<TabId, ReactNode> = {
  accueil: <IconHome />,
  carte: <IconVan />,
  budget: <IconWallet />,
  taches: <IconChecklist />,
  materiel: <IconCrate />,
  plus: <IconDots />,
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("accueil");

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={TAB_TITLES[activeTab]}
      titleIcon={TAB_ICONS[activeTab]}
    >
      {activeTab === "accueil" && (
        <Dashboard
          onOpenCarte={() => setActiveTab("carte")}
          onOpenBudget={() => setActiveTab("budget")}
          onOpenTaches={() => setActiveTab("taches")}
          onOpenStats={() => setActiveTab("plus")}
          onOpenPlus={() => setActiveTab("plus")}
        />
      )}
      {activeTab === "carte" && <CartePage />}
      {activeTab === "budget" && <BudgetPage />}
      {activeTab === "taches" && <TachesPage />}
      {activeTab === "materiel" && <MaterielPage />}
      {activeTab === "plus" && (
        <PlusPage onOpenTaches={() => setActiveTab("taches")} />
      )}
    </AppShell>
  );
}

export default App;
