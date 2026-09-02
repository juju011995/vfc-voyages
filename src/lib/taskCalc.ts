// Calculs et requêtes du module Tâches — y compris les points d'entrée
// pensés pour être réutilisés par de futurs modules (Loki, Calendrier) sans
// dupliquer la donnée : voir le commentaire "Module Tâches" dans types.ts.

import type { Task, TaskPriority, TaskStatus, TaskTag } from "./types";
import type { StatusStage } from "./statusColors";

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 0,
  normal: 1,
  "pas-presse": 2,
};

/** Statut d'une tâche en "étape" générique — pour la couleur partagée avec le module Matériel (voir statusColors.ts). */
export function taskStatusStage(status: TaskStatus): StatusStage {
  if (status === "a-faire") return "todo";
  if (status === "en-cours") return "in-progress";
  return "done";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(task: Task): boolean {
  return task.status !== "fait" && Boolean(task.dueDate) && task.dueDate! < todayIso();
}

/** Tri par défaut à l'intérieur d'une colonne : priorité, puis échéance la plus proche, puis ancienneté. */
export function sortTasksForColumn(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.dueDate && b.dueDate) {
      const dueDiff = a.dueDate.localeCompare(b.dueDate);
      if (dueDiff !== 0) return dueDiff;
    } else if (a.dueDate) {
      return -1;
    } else if (b.dueDate) {
      return 1;
    }

    return a.createdAt - b.createdAt;
  });
}

export interface TaskCounts {
  aFaire: number;
  enCours: number;
  fait: number;
  enRetard: number;
}

export function countTasks(tasks: Task[]): TaskCounts {
  return {
    aFaire: tasks.filter((t) => t.status === "a-faire").length,
    enCours: tasks.filter((t) => t.status === "en-cours").length,
    fait: tasks.filter((t) => t.status === "fait").length,
    enRetard: tasks.filter(isOverdue).length,
  };
}

export interface UpcomingDeadline {
  taskId: string;
  title: string;
  dueDate: string;
  overdue: boolean;
}

/** Échéances à venir (et en retard), triées par date — prêt pour un futur module Calendrier. */
export function listUpcomingDeadlines(tasks: Task[]): UpcomingDeadline[] {
  return tasks
    .filter((t) => t.status !== "fait" && t.dueDate)
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      dueDate: t.dueDate!,
      overdue: isOverdue(t),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Tâches portant un tag donné (par nom) — prêt pour un futur module Loki. */
export function getTasksByTagName(
  tasks: Task[],
  tags: TaskTag[],
  tagName: string,
): Task[] {
  const tag = tags.find((t) => t.name.trim().toLowerCase() === tagName.trim().toLowerCase());
  if (!tag) return [];
  return tasks.filter((t) => t.tagId === tag.id);
}
