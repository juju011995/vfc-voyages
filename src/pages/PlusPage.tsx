import { useState } from "react";
import { CalendarPage } from "./CalendarPage";
import { LokiPage } from "./LokiPage";
import { MaterielPage } from "./MaterielPage";
import { VehiclePage } from "./VehiclePage";
import { SettingsPage } from "./SettingsPage";
import "./PlusPage.css";

type PlusSubPage = "menu" | "calendrier" | "loki" | "materiel" | "vehicule" | "parametres";

interface PlusPageProps {
  onOpenTaches: () => void;
}

export function PlusPage({ onOpenTaches }: PlusPageProps) {
  const [subPage, setSubPage] = useState<PlusSubPage>("menu");

  if (subPage !== "menu") {
    return (
      <div className="plus-page">
        <button
          type="button"
          className="plus-page__back"
          onClick={() => setSubPage("menu")}
        >
          ← Retour
        </button>
        {subPage === "calendrier" && <CalendarPage onOpenTaches={onOpenTaches} />}
        {subPage === "loki" && <LokiPage onOpenTaches={onOpenTaches} />}
        {subPage === "materiel" && <MaterielPage />}
        {subPage === "vehicule" && <VehiclePage />}
        {subPage === "parametres" && <SettingsPage />}
      </div>
    );
  }

  return (
    <div className="plus-page">
      <button
        type="button"
        className="plus-page__menu-item"
        onClick={() => setSubPage("calendrier")}
      >
        <span>Calendrier</span>
        <span className="plus-page__menu-item-arrow">→</span>
      </button>

      <button
        type="button"
        className="plus-page__menu-item"
        onClick={() => setSubPage("loki")}
      >
        <span>Loki</span>
        <span className="plus-page__menu-item-arrow">→</span>
      </button>

      <button
        type="button"
        className="plus-page__menu-item"
        onClick={() => setSubPage("materiel")}
      >
        <span>Matériel</span>
        <span className="plus-page__menu-item-arrow">→</span>
      </button>

      <button
        type="button"
        className="plus-page__menu-item"
        onClick={() => setSubPage("vehicule")}
      >
        <span>Véhicule</span>
        <span className="plus-page__menu-item-arrow">→</span>
      </button>

      <button
        type="button"
        className="plus-page__menu-item"
        onClick={() => setSubPage("parametres")}
      >
        <span>Paramètres</span>
        <span className="plus-page__menu-item-arrow">→</span>
      </button>
    </div>
  );
}
