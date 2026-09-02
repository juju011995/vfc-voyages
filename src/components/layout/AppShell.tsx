import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import "./AppShell.css";

export type TabId = "accueil" | "carte" | "budget" | "taches" | "stats" | "plus";

const TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: "accueil", label: "Accueil", icon: <IconHome /> },
  { id: "carte", label: "Carte", icon: <IconMap /> },
  { id: "budget", label: "Budget", icon: <IconWallet /> },
  { id: "taches", label: "Tâches", icon: <IconCheck /> },
  { id: "stats", label: "Stats", icon: <IconChart /> },
  { id: "plus", label: "Plus", icon: <IconDots /> },
];

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  title: string;
  children: ReactNode;
}

export function AppShell({
  activeTab,
  onTabChange,
  title,
  children,
}: AppShellProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        <h1 className="app-shell__title">{title}</h1>
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

      <main className="app-shell__content">{children}</main>

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

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="6"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.5" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m8 12 2.5 2.5L16 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M4 20V4M4 20h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 16v-4M13 16V8M18 16v-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDots() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.7 6.7 0 0 0 10.2 10.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
