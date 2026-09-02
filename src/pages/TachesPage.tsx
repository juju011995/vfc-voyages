import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  deleteTask,
  listTaskTags,
  listTasks,
  saveTask,
  saveTaskTag,
} from "../lib/db";
import { sortTasksForColumn } from "../lib/taskCalc";
import type { Task, TaskStatus, TaskTag } from "../lib/types";
import { useTheme } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import { PayerFilter, type PayerFilterValue } from "../components/shared/PayerFilter";
import { TagFilter, type TagFilterValue } from "../components/shared/TagFilter";
import { TagManager } from "../components/shared/TagManager";
import { TaskColumn } from "../components/tasks/TaskColumn";
import { TaskEditor } from "../components/tasks/TaskEditor";
import "./TachesPage.css";

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: "a-faire", title: "À faire" },
  { status: "en-cours", title: "En cours" },
  { status: "fait", title: "Fait" },
];

export function TachesPage() {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);

  const [tags, setTags] = useState<TaskTag[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [assigneeFilter, setAssigneeFilter] = useState<PayerFilterValue>("tous");
  const [tagFilter, setTagFilter] = useState<TagFilterValue>("tous");
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>("a-faire");
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [showTagManager, setShowTagManager] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    (async () => {
      const [loadedTags, loadedTasks] = await Promise.all([listTaskTags(), listTasks()]);
      setTags(loadedTags);
      setTasks(loadedTasks);
      setLoaded(true);
    })();
  }, []);

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((t) => assigneeFilter === "tous" || t.assignee === assigneeFilter)
        .filter((t) => tagFilter === "tous" || t.tagId === tagFilter),
    [tasks, assigneeFilter, tagFilter],
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      "a-faire": [],
      "en-cours": [],
      fait: [],
    };
    for (const task of filteredTasks) grouped[task.status].push(task);
    for (const status of Object.keys(grouped) as TaskStatus[]) {
      grouped[status] = sortTasksForColumn(grouped[status]);
    }
    return grouped;
  }, [filteredTasks]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  async function handleAddTask() {
    const now = Date.now();
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "",
      tagId: tags.find((t) => !t.archived)?.id ?? tags[0]?.id ?? "",
      assignee: "both",
      priority: "normal",
      status: mobileStatus,
      createdAt: now,
      updatedAt: now,
    };
    await saveTask(newTask);
    setTasks((prev) => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
  }

  async function handleSaveTask(updates: Partial<Task>) {
    if (!selectedTaskId) return;
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === selectedTaskId ? { ...t, ...updates, updatedAt: Date.now() } : t,
      );
      const updated = next.find((t) => t.id === selectedTaskId);
      if (updated) saveTask(updated);
      return next;
    });
  }

  async function handleDeleteTask(id: string) {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTaskId((current) => (current === id ? undefined : current));
  }

  function handleCloseEditor() {
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (task && !task.title.trim()) {
      handleDeleteTask(task.id);
    } else {
      setSelectedTaskId(undefined);
    }
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, status, updatedAt: Date.now() } : t,
      );
      const updated = next.find((t) => t.id === id);
      if (updated) saveTask(updated);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || typeof over.id !== "string" || !over.id.startsWith("column:")) return;
    const targetStatus = over.id.slice("column:".length) as TaskStatus;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== targetStatus) {
      handleStatusChange(task.id, targetStatus);
    }
  }

  async function handleAddTag(name: string) {
    const tag: TaskTag = {
      id: crypto.randomUUID(),
      name,
      isDefault: false,
      createdAt: Date.now(),
    };
    await saveTaskTag(tag);
    setTags((prev) => [...prev, tag]);
  }

  async function handleRenameTag(id: string, name: string) {
    const tag = tags.find((t) => t.id === id);
    if (!tag) return;
    const updated = { ...tag, name };
    await saveTaskTag(updated);
    setTags((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleArchiveTag(id: string) {
    const tag = tags.find((t) => t.id === id);
    if (!tag) return;
    const updated = { ...tag, archived: true };
    await saveTaskTag(updated);
    setTags((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  if (!loaded) {
    return <p className="taches-page__loading">Chargement…</p>;
  }

  return (
    <div className="taches-page">
      <div className="taches-page__toolbar">
        <PayerFilter value={assigneeFilter} onChange={setAssigneeFilter} palette={palette} />
        <button type="button" className="btn btn--primary" onClick={handleAddTask}>
          + Ajouter une tâche
        </button>
      </div>

      <TagFilter items={tags} value={tagFilter} onChange={setTagFilter} allLabel="Tous les tags" />

      <button
        type="button"
        className="taches-page__tags-toggle"
        onClick={() => setShowTagManager((v) => !v)}
      >
        {showTagManager ? "Masquer la gestion des tags" : "Gérer les tags"}
      </button>

      {showTagManager && (
        <TagManager
          items={tags}
          addPlaceholder="Nouveau tag…"
          onAdd={handleAddTag}
          onRename={handleRenameTag}
          onArchive={handleArchiveTag}
          onFilter={(id) => {
            setTagFilter(id);
            setShowTagManager(false);
          }}
        />
      )}

      <div className="taches-page__mobile-tabs" role="tablist" aria-label="Statut">
        {COLUMNS.map((col) => (
          <button
            key={col.status}
            type="button"
            role="tab"
            aria-selected={mobileStatus === col.status}
            className={mobileStatus === col.status ? "is-active" : ""}
            onClick={() => setMobileStatus(col.status)}
          >
            {col.title} · {tasksByStatus[col.status].length}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="taches-page__board">
          {COLUMNS.map((col) => (
            <div
              key={col.status}
              className={
                "taches-page__column-wrap" +
                (mobileStatus === col.status ? " taches-page__column-wrap--active-mobile" : "")
              }
            >
              <TaskColumn
                status={col.status}
                title={col.title}
                tasks={tasksByStatus[col.status]}
                tags={tags}
                palette={palette}
                onOpen={(task) => setSelectedTaskId(task.id)}
                onStatusChange={handleStatusChange}
              />
            </div>
          ))}
        </div>
      </DndContext>

      {selectedTask && (
        <div className="taches-page__editor-overlay">
          <TaskEditor
            task={selectedTask}
            tags={tags}
            palette={palette}
            onClose={handleCloseEditor}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
          />
        </div>
      )}
    </div>
  );
}
