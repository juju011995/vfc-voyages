import { useState } from "react";
import type { MaintenanceStatus } from "../../lib/vehicleCalc";
import { MAINTENANCE_URGENCY_LABELS } from "../../lib/vehicleCalc";
import type { Task } from "../../lib/types";
import { STATUS_STAGE_COLOR, STATUS_TEXT_ON_COLOR } from "../../lib/statusColors";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import "./MaintenanceCard.css";

interface MaintenanceCardProps {
  status: MaintenanceStatus;
  linkedTask?: Task;
  /** Tâches non déjà liées à un autre type — candidates pour un nouveau lien. */
  linkableTasks: Task[];
  currentOdometerKm: number;
  onOpenLogEditor: (typeId: string, prefillKm?: number) => void;
  onLinkTask: (typeId: string, taskId: string) => void;
  onUnlinkTask: (typeId: string) => void;
}

function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString("fr-FR")} km`;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function urgencyBadgeStyle(urgency: MaintenanceStatus["urgency"]) {
  if (urgency === "overdue") {
    return { background: "var(--color-alert)", color: "var(--color-action-contrast)" };
  }
  if (urgency === "due-soon") {
    return {
      background: STATUS_STAGE_COLOR["in-progress"],
      color: STATUS_TEXT_ON_COLOR,
    };
  }
  return { background: STATUS_STAGE_COLOR.done, color: STATUS_TEXT_ON_COLOR };
}

export function MaintenanceCard({
  status,
  linkedTask,
  linkableTasks,
  currentOdometerKm,
  onOpenLogEditor,
  onLinkTask,
  onUnlinkTask,
}: MaintenanceCardProps) {
  const [taskToLink, setTaskToLink] = useState("");
  const { type, lastLog, nextDueKm, remainingKm, urgency } = status;

  const showCompletionPrompt =
    linkedTask?.status === "fait" && (!lastLog || lastLog.updatedAt < linkedTask.updatedAt);

  return (
    <div className="maintenance-card">
      <div className="maintenance-card__header">
        <h4
          className="maintenance-card__type"
          style={type.color ? { background: type.color, color: TAG_TEXT_ON_COLOR } : undefined}
        >
          {type.name}
        </h4>
        <span className="maintenance-card__badge" style={urgencyBadgeStyle(urgency)}>
          {MAINTENANCE_URGENCY_LABELS[urgency]}
        </span>
      </div>

      <p className="maintenance-card__last">
        {lastLog
          ? `Dernière intervention : ${formatDate(lastLog.date)} · ${formatKm(lastLog.km)}`
          : "Aucune intervention enregistrée pour l'instant."}
      </p>

      {type.intervalKm ? (
        <p className="maintenance-card__next">
          Prochaine échéance : {formatKm(nextDueKm!)}
          {remainingKm !== undefined &&
            (remainingKm > 0
              ? ` (dans ${formatKm(remainingKm)})`
              : ` (dépassée de ${formatKm(-remainingKm)})`)}
        </p>
      ) : (
        <p className="maintenance-card__next maintenance-card__next--muted">
          Pas d'intervalle défini pour ce type.
        </p>
      )}

      {showCompletionPrompt && (
        <div className="maintenance-card__prompt">
          <p>
            « {linkedTask!.title || "Tâche liée"} » est marquée faite — enregistrer
            l'intervention {type.name} ?
          </p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => onOpenLogEditor(type.id, currentOdometerKm)}
          >
            Enregistrer l'intervention
          </button>
        </div>
      )}

      <button
        type="button"
        className="maintenance-card__add"
        onClick={() => onOpenLogEditor(type.id, currentOdometerKm)}
      >
        + Enregistrer une intervention
      </button>

      <div className="maintenance-card__link">
        {linkedTask ? (
          <div className="maintenance-card__linked-task">
            <span>Tâche liée : {linkedTask.title || "Tâche sans titre"}</span>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => onUnlinkTask(type.id)}
            >
              Délier
            </button>
          </div>
        ) : linkableTasks.length > 0 ? (
          <div className="maintenance-card__link-picker">
            <select value={taskToLink} onChange={(e) => setTaskToLink(e.target.value)}>
              <option value="">Lier une tâche…</option>
              {linkableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title || "Tâche sans titre"}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!taskToLink}
              onClick={() => {
                if (taskToLink) {
                  onLinkTask(type.id, taskToLink);
                  setTaskToLink("");
                }
              }}
            >
              Lier
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
