import type { Treatment } from "../../lib/types";
import "./TreatmentList.css";

const TYPE_LABELS: Record<Treatment["type"], string> = {
  antiparasitaire: "Antiparasitaire",
  vermifuge: "Vermifuge",
  autre: "Autre",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface TreatmentListProps {
  treatments: Treatment[];
  onEdit: (treatment: Treatment) => void;
}

export function TreatmentList({ treatments, onEdit }: TreatmentListProps) {
  if (treatments.length === 0) {
    return <p className="treatment-list__empty">Aucun traitement enregistré.</p>;
  }

  const today = todayIso();

  return (
    <ul className="treatment-list">
      {treatments.map((t) => {
        const overdue = Boolean(t.nextDueDate && t.nextDueDate < today);
        return (
          <li key={t.id} className="treatment-list__row">
            <button type="button" className="treatment-list__main" onClick={() => onEdit(t)}>
              <span className="treatment-list__type">{TYPE_LABELS[t.type]}</span>
              <span className="treatment-list__info">
                <span className="treatment-list__title">
                  {t.product || TYPE_LABELS[t.type]}
                </span>
                <span className="treatment-list__date">
                  Le {formatDate(t.date)}
                  {t.nextDueDate && (
                    <span className={overdue ? "treatment-list__due--overdue" : undefined}>
                      {" · "}
                      {overdue ? "rappel dépassé" : "rappel"} {formatDate(t.nextDueDate)}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
