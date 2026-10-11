import { useState } from "react";
import type { MaterielItem, MaterielItemStatus, Task } from "../../lib/types";
import { MATERIEL_STATUS_LABELS, materielStatusColor } from "../../lib/materielCalc";
import { MATERIEL_DEJA_POSSEDE_COLOR, STATUS_TEXT_ON_COLOR } from "../../lib/statusColors";
import { IconCheck } from "../icons/Icons";
import "./MaterielItemCard.css";

// Les 3 statuts d'achat historiques restent le rang principal, inchangé.
// "Déjà possédé" est une case à part (voir le rendu plus bas) pour ne pas
// surcharger la carte avec un 4e bouton de même poids visuel.
const STATUSES: MaterielItemStatus[] = ["a-acheter", "en-cours", "achete"];

interface MaterielItemCardProps {
  item: MaterielItem;
  linkedTask?: Task;
  onOpen: (item: MaterielItem) => void;
  onStatusChange: (id: string, status: MaterielItemStatus) => void;
}

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function MaterielItemCard({
  item,
  linkedTask,
  onOpen,
  onStatusChange,
}: MaterielItemCardProps) {
  const [justCompleted, setJustCompleted] = useState(false);

  function handleStatusClick(status: MaterielItemStatus) {
    if (status === "achete" && item.status !== "achete") {
      setJustCompleted(true);
      window.setTimeout(() => setJustCompleted(false), 400);
    }
    onStatusChange(item.id, status);
  }

  return (
    <div className="materiel-item-card">
      <button type="button" className="materiel-item-card__body" onClick={() => onOpen(item)}>
        <div className="materiel-item-card__top">
          <h4
            className={
              "materiel-item-card__name" +
              (item.status === "achete" || item.status === "deja-possede"
                ? " materiel-item-card__name--done"
                : "")
            }
          >
            {item.name || "Sans nom"}
          </h4>
          <span className="materiel-item-card__qty">×{item.quantity}</span>
        </div>
        {item.notes && <p className="materiel-item-card__notes">{item.notes}</p>}
        <div className="materiel-item-card__meta">
          {linkedTask && (
            <span className="materiel-item-card__link">🔗 {linkedTask.title || "Tâche liée"}</span>
          )}
          {item.priceEUR !== undefined && (
            <span className="materiel-item-card__price">{formatEUR(item.priceEUR)}</span>
          )}
        </div>
      </button>

      <div className="materiel-item-card__status-row">
        <div className="materiel-item-card__status-toggle">
          {STATUSES.map((status) => {
            const color = materielStatusColor(status);
            const active = status === item.status;
            const pop = active && status === "achete" && justCompleted;
            return (
              <button
                key={status}
                type="button"
                className={(active ? "is-active" : "") + (pop ? " is-pop" : "")}
                style={
                  active
                    ? { background: color, color: STATUS_TEXT_ON_COLOR, borderColor: color }
                    : { borderColor: color }
                }
                onClick={() => handleStatusClick(status)}
              >
                {MATERIEL_STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={
            "materiel-item-card__deja-possede" +
            (item.status === "deja-possede" ? " is-active" : "")
          }
          style={
            item.status === "deja-possede"
              ? {
                  background: MATERIEL_DEJA_POSSEDE_COLOR,
                  color: STATUS_TEXT_ON_COLOR,
                  borderColor: MATERIEL_DEJA_POSSEDE_COLOR,
                }
              : { borderColor: MATERIEL_DEJA_POSSEDE_COLOR }
          }
          onClick={() =>
            handleStatusClick(item.status === "deja-possede" ? "a-acheter" : "deja-possede")
          }
          title="Objet déjà en main, jamais acheté pour le voyage"
        >
          {item.status === "deja-possede" && <IconCheck />}
          Déjà possédé
        </button>
      </div>
    </div>
  );
}
