import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import {
  IconHome,
  IconVan,
  IconWallet,
  IconChecklist,
  IconCrate,
  IconDots,
  IconSun,
  IconMoon,
} from "../icons/Icons";
import "./AppShell.css";

export type TabId = "accueil" | "carte" | "budget" | "taches" | "materiel" | "plus";

const TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: "accueil", label: "Accueil", icon: <IconHome /> },
  { id: "carte", label: "Carte", icon: <IconVan /> },
  { id: "budget", label: "Budget", icon: <IconWallet /> },
  { id: "taches", label: "Tâches", icon: <IconChecklist /> },
  { id: "materiel", label: "Matériel", icon: <IconCrate /> },
  { id: "plus", label: "Plus", icon: <IconDots /> },
];

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  title: string;
  titleIcon?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  activeTab,
  onTabChange,
  title,
  titleIcon,
  children,
}: AppShellProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        <h1 className="app-shell__title">
          {titleIcon && <span className="app-shell__title-icon">{titleIcon}</span>}
          {title}
        </h1>
        <button
          type="button"
          className="app-shell__theme-toggle"
          onClick={toggleTheme}
          aria-label={
            resolvedTheme === "dark"
              ? "Passer en mode clair"
              : "Passer en mode sombre"
          }
          title={
            resolvedTheme === "dark"
              ? "Passer en mode clair"
              : "Passer en mode sombre"
          }
        >
          {resolvedTheme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <main className="app-shell__content page-transition" key={activeTab}>
        {children}
      </main>

      <nav className="app-shell__bottom-nav" aria-label="Navigation principale">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              "app-shell__nav-item" +
              (tab.id === activeTab ? " app-shell__nav-item--active" : "")
            }
            onClick={() => onTabChange(tab.id)}
            aria-current={tab.id === activeTab ? "page" : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
