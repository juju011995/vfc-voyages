import type { MaterielItem, MaterielItemStatus, Task } from "../../lib/types";
import { MATERIEL_STATUS_LABELS, materielStatusStage } from "../../lib/materielCalc";
import { STATUS_STAGE_COLOR, STATUS_TEXT_ON_COLOR } from "../../lib/statusColors";
import "./MaterielItemCard.css";

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
  return (
    <div className="materiel-item-card">
      <button type="button" className="materiel-item-card__body" onClick={() => onOpen(item)}>
        <div className="materiel-item-card__top">
          <h4
            className={
              "materiel-item-card__name" +
              (item.status === "achete" ? " materiel-item-card__name--done" : "")
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

      <div className="materiel-item-card__status-toggle">
        {STATUSES.map((status) => {
          const color = STATUS_STAGE_COLOR[materielStatusStage(status)];
          const active = status === item.status;
          return (
            <button
              key={status}
              type="button"
              className={active ? "is-active" : ""}
              style={
                active
                  ? { background: color, color: STATUS_TEXT_ON_COLOR, borderColor: color }
                  : { borderColor: color }
              }
              onClick={() => onStatusChange(item.id, status)}
            >
              {MATERIEL_STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
