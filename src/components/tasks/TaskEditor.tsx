import { useEffect, useState } from "react";
import type { Payer, Task, TaskPriority, TaskStatus, TaskTag } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { PersonBadge } from "../shared/PersonBadge";
import "./TaskEditor.css";

interface TaskEditorProps {
  task: Task;
  tags: TaskTag[];
  palette: Palette;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

const PAYERS: Payer[] = ["justine", "nathan", "both"];
const PRIORITIES: TaskPriority[] = ["urgent", "normal", "pas-presse"];
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  normal: "Normal",
  "pas-presse": "Pas pressé",
};
const STATUSES: TaskStatus[] = ["a-faire", "en-cours", "fait"];
const STATUS_LABELS: Record<TaskStatus, string> = {
  "a-faire": "À faire",
  "en-cours": "En cours",
  fait: "Fait",
};

export function TaskEditor({ task, tags, palette, onClose, onSave, onDelete }: TaskEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [tagId, setTagId] = useState(task.tagId);
  const [assignee, setAssignee] = useState<Payer>(task.assignee);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setTagId(task.tagId);
    setAssignee(task.assignee);
    setDueDate(task.dueDate ?? "");
    setPriority(task.priority);
    setStatus(task.status);
  }, [task.id, task.title, task.description, task.tagId, task.assignee, task.dueDate, task.priority, task.status]);

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      tagId,
      assignee,
      dueDate: dueDate || undefined,
      priority,
      status,
    });
  }

  return (
    <div className="task-editor" role="dialog" aria-label="Fiche tâche">
      <div className="task-editor__header">
        <input
          type="text"
          className="task-editor__title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de la tâche"
          autoFocus
        />
        <button
          type="button"
          className="task-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <label className="task-editor__field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Détails, notes libres…"
        />
      </label>

      <label className="task-editor__field">
        <span>Tag</span>
        <select value={tagId} onChange={(e) => setTagId(e.target.value)}>
          {tags
            .filter((t) => !t.archived)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </label>

      <div className="task-editor__field">
        <span>Assigné à</span>
        <div className="task-editor__toggle">
          {PAYERS.map((p) => (
            <button
              key={p}
              type="button"
              className={p === assignee ? "is-active" : ""}
              onClick={() => setAssignee(p)}
            >
              <PersonBadge payer={p} palette={palette} size={18} />
              {p === "both" ? "Les deux" : p === "justine" ? "Justine" : "Nathan"}
            </button>
          ))}
        </div>
      </div>

      <label className="task-editor__field">
        <span>Échéance</span>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>

      <div className="task-editor__field">
        <span>Priorité</span>
        <div className="task-editor__toggle">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              className={p === priority ? "is-active" : ""}
              onClick={() => setPriority(p)}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="task-editor__field">
        <span>Statut</span>
        <div className="task-editor__toggle">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={s === status ? "is-active" : ""}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="task-editor__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Enregistrer
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => onDelete(task.id)}
        >
          Supprimer la tâche
        </button>
      </div>
    </div>
  );
}
