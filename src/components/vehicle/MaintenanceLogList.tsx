import type { MaintenanceLog, MaintenanceType } from "../../lib/types";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import "./MaintenanceLogList.css";

interface MaintenanceLogListProps {
  logs: MaintenanceLog[];
  types: MaintenanceType[];
  onEdit: (log: MaintenanceLog) => void;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MaintenanceLogList({ logs, types, onEdit }: MaintenanceLogListProps) {
  const typeById = new Map(types.map((t) => [t.id, t]));

  if (logs.length === 0) {
    return <p className="maintenance-log-list__empty">Aucune intervention pour ce filtre pour l'instant.</p>;
  }

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km);

  return (
    <ul className="maintenance-log-list">
      {sorted.map((log) => {
        const type = typeById.get(log.typeId);
        return (
          <li key={log.id} className="maintenance-log-list__row">
            <button type="button" className="maintenance-log-list__main" onClick={() => onEdit(log)}>
              <span className="maintenance-log-list__date">{formatDate(log.date)}</span>
              <span className="maintenance-log-list__info">
                <span
                  className="maintenance-log-list__type"
                  style={type?.color ? { background: type.color, color: TAG_TEXT_ON_COLOR } : undefined}
                >
                  {type?.name ?? "Type inconnu"}
                </span>
                {log.notes && <span className="maintenance-log-list__note">{log.notes}</span>}
              </span>
              <span className="maintenance-log-list__km">{log.km.toLocaleString("fr-FR")} km</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
