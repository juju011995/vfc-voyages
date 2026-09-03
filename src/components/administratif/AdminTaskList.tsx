import type { Task, TaskTag } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import { PersonBadge } from "../shared/PersonBadge";
import "./AdminTaskList.css";

const STATUS_LABELS: Record<Task["status"], string> = {
  "a-faire": "À faire",
  "en-cours": "En cours",
  fait: "Fait",
};

interface AdminTaskListProps {
  tasks: Task[];
  adminTag?: TaskTag;
  palette: Palette;
  onOpenTaches: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function AdminTaskList({ tasks, adminTag, palette, onOpenTaches }: AdminTaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="admin-task-list__empty">
        Aucune tâche taguée « Administratif » pour l'instant — ajoute ce tag à
        une tâche dans le module Tâches pour qu'elle apparaisse ici
        automatiquement.
      </p>
    );
  }

  return (
    <ul className="admin-task-list">
      {tasks.map((task) => (
        <li key={task.id} className="admin-task-list__row">
          <button type="button" className="admin-task-list__main" onClick={onOpenTaches}>
            {adminTag && (
              <span
                className="admin-task-list__tag"
                style={
                  adminTag.color
                    ? { background: adminTag.color, color: TAG_TEXT_ON_COLOR }
                    : undefined
                }
              >
                {adminTag.name}
              </span>
            )}
            <span className="admin-task-list__info">
              <span className="admin-task-list__title">{task.title}</span>
              <span className="admin-task-list__meta">
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
