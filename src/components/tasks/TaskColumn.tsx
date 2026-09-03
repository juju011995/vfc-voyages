import { useDroppable } from "@dnd-kit/core";
import type { Task, TaskStatus, TaskTag } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { TaskCard } from "./TaskCard";
import "./TaskColumn.css";

export function columnDroppableId(status: TaskStatus): string {
  return `column:${status}`;
}

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  tags: TaskTag[];
  palette: Palette;
  justCompletedIds: Set<string>;
  onOpen: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export function TaskColumn({
  status,
  title,
  tasks,
  tags,
  palette,
  justCompletedIds,
  onOpen,
  onStatusChange,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });

  return (
    <div className="task-column">
      <div className="task-column__header">
        <h3>{title}</h3>
        <span className="task-column__count">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={"task-column__drop-zone" + (isOver ? " task-column__drop-zone--over" : "")}
      >
        {tasks.length === 0 && <p className="task-column__empty">Aucune tâche</p>}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            tag={tags.find((t) => t.id === task.tagId)}
            palette={palette}
            justCompleted={justCompletedIds.has(task.id)}
            onOpen={onOpen}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
