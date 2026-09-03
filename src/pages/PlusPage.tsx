import { useState, type ReactNode } from "react";
import { CalendarPage } from "./CalendarPage";
import { LokiPage } from "./LokiPage";
import { VehiclePage } from "./VehiclePage";
import { AdministratifPage } from "./AdministratifPage";
import { StatsPage } from "./StatsPage";
import { SettingsPage } from "./SettingsPage";
import {
  IconCalendar,
  IconPawprint,
  IconWrench,
  IconIdCard,
  IconChartBars,
  IconGear,
} from "../components/icons/Icons";
import "./PlusPage.css";

type PlusSubPage =
  | "menu"
  | "calendrier"
  | "loki"
  | "vehicule"
  | "administratif"
  | "stats"
  | "parametres";

interface PlusPageProps {
  onOpenTaches: () => void;
}

const MENU_ITEMS: Array<{ id: PlusSubPage; label: string; icon: ReactNode }> = [
  { id: "calendrier", label: "Calendrier", icon: <IconCalendar /> },
  { id: "loki", label: "Loki", icon: <IconPawprint /> },
  { id: "vehicule", label: "Véhicule", icon: <IconWrench /> },
  { id: "administratif", label: "Administratif", icon: <IconIdCard /> },
  { id: "stats", label: "Statistiques", icon: <IconChartBars /> },
  { id: "parametres", label: "Paramètres", icon: <IconGear /> },
];

export function PlusPage({ onOpenTaches }: PlusPageProps) {
  const [subPage, setSubPage] = useState<PlusSubPage>("menu");

  if (subPage !== "menu") {
    return (
      <div className="plus-page page-transition" key={subPage}>
        <button
          type="button"
          className="plus-page__back"
          onClick={() => setSubPage("menu")}
        >
          ← Retour
        </button>
        {subPage === "calendrier" && <CalendarPage onOpenTaches={onOpenTaches} />}
        {subPage === "loki" && <LokiPage onOpenTaches={onOpenTaches} />}
        {subPage === "vehicule" && <VehiclePage />}
        {subPage === "administratif" && <AdministratifPage onOpenTaches={onOpenTaches} />}
        {subPage === "stats" && <StatsPage />}
        {subPage === "parametres" && <SettingsPage />}
      </div>
    );
  }

  return (
    <div className="plus-page page-transition" key="menu">
      {MENU_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="plus-page__menu-item"
          onClick={() => setSubPage(item.id)}
        >
          <span className="plus-page__menu-item-label">
            <span className="plus-page__menu-item-icon">{item.icon}</span>
            {item.label}
          </span>
          <span className="plus-page__menu-item-arrow">→</span>
        </button>
      ))}
    </div>
  );
}
