import type { Task, TaskTag } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import { PersonBadge } from "../shared/PersonBadge";
import "./LokiTaskList.css";

const STATUS_LABELS: Record<Task["status"], string> = {
  "a-faire": "À faire",
  "en-cours": "En cours",
  fait: "Fait",
};

interface LokiTaskListProps {
  tasks: Task[];
  lokiTag?: TaskTag;
  palette: Palette;
  onOpenTaches: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function LokiTaskList({ tasks, lokiTag, palette, onOpenTaches }: LokiTaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="loki-task-list__empty">
        Aucune tâche taguée « Loki » pour l'instant — ajoute ce tag à une tâche
        dans le module Tâches pour qu'elle apparaisse ici automatiquement.
      </p>
    );
  }

  return (
    <ul className="loki-task-list">
      {tasks.map((task) => (
        <li key={task.id} className="loki-task-list__row">
          <button type="button" className="loki-task-list__main" onClick={onOpenTaches}>
            {lokiTag && (
              <span
                className="loki-task-list__tag"
                style={
                  lokiTag.color
                    ? { background: lokiTag.color, color: TAG_TEXT_ON_COLOR }
                    : undefined
                }
              >
                {lokiTag.name}
              </span>
            )}
            <span className="loki-task-list__info">
              <span className="loki-task-list__title">{task.title}</span>
              <span className="loki-task-list__meta">
                {STATUS_LABELS[task.status]}
                {task.dueDate ? ` · Échéance ${formatDate(task.dueDate)}` : ""}
              </span>
            </span>
            <PersonBadge payer={task.assignee} palette={palette} size={20} />
          </button>
        </li>
      ))}
    </ul>
  );
}
