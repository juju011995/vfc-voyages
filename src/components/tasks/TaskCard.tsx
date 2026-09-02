import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task, TaskStatus, TaskTag } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { isOverdue, taskStatusStage } from "../../lib/taskCalc";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import { STATUS_STAGE_COLOR, STATUS_TEXT_ON_COLOR } from "../../lib/statusColors";
import { PersonBadge } from "../shared/PersonBadge";
import "./TaskCard.css";

const STATUS_LABELS: Record<TaskStatus, string> = {
  "a-faire": "À faire",
  "en-cours": "En cours",
  fait: "Fait",
};

const PRIORITY_LABELS = {
  urgent: "Urgent",
  normal: "Normal",
  "pas-presse": "Pas pressé",
} as const;

const STATUSES: TaskStatus[] = ["a-faire", "en-cours", "fait"];

interface TaskCardProps {
  task: Task;
  tag?: TaskTag;
  palette: Palette;
  onOpen: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function formatDueDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function TaskCard({ task, tag, palette, onOpen, onStatusChange }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const overdue = isOverdue(task);

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className="task-card">
      <div className="task-card__header">
        <button
          type="button"
          className="task-card__drag-handle"
          aria-label={`Réordonner ${task.title}`}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        {tag && (
          <span
            className="task-card__tag"
            style={
              tag.color
                ? { background: tag.color, color: TAG_TEXT_ON_COLOR }
                : undefined
            }
          >
            {tag.name}
          </span>
        )}
        <span className={`task-card__priority task-card__priority--${task.priority}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      <button type="button" className="task-card__body" onClick={() => onOpen(task)}>
        <h4
          className={
            "task-card__title" + (task.status === "fait" ? " task-card__title--done" : "")
          }
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="task-card__description">{task.description}</p>
        )}
        <div className="task-card__meta">
          {task.dueDate && (
            <span
              className={
                "task-card__due" + (overdue ? " task-card__due--overdue" : "")
              }
            >
              {overdue ? "En retard · " : "Échéance "}
              {formatDueDate(task.dueDate)}
            </span>
          )}
          <PersonBadge payer={task.assignee} palette={palette} size={20} />
        </div>
      </button>

      <div className="task-card__status-toggle">
        {STATUSES.map((status) => {
          const color = STATUS_STAGE_COLOR[taskStatusStage(status)];
          const active = status === task.status;
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
              onClick={() => onStatusChange(task.id, status)}
            >
              {STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
