import { useState } from "react";
import { CalendarPage } from "./CalendarPage";
import { LokiPage } from "./LokiPage";
import { MaterielPage } from "./MaterielPage";
import "./PlusPage.css";

type PlusSubPage = "menu" | "calendrier" | "loki" | "materiel";

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

      <div className="plus-page__grid">
        <PlaceholderCard title="Statistiques" text="Module à venir" />
        <PlaceholderCard title="Paramètres" text="Module à venir" />
      </div>
    </div>
  );
}

function PlaceholderCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="plus-page__placeholder-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
