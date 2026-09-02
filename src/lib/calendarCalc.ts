// Calculs du module Calendrier — fusionne à la volée les échéances du
// module Tâches et les événements indépendants, sans jamais dupliquer la
// donnée des tâches (voir le commentaire "Module Calendrier" dans types.ts).

import type { CalendarEvent, Payer, Task, TaskStatus } from "./types";

export interface AgendaItem {
  id: string;
  title: string;
  /** Date ISO (YYYY-MM-DD) — début pour un événement multi-jours. */
  date: string;
  endDate?: string;
  time?: string;
  description?: string;
  kind: "event" | "task";
  taskStatus?: TaskStatus;
  taskAssignee?: Payer;
  taskTagId?: string;
}

const MAX_MULTIDAY_SPAN = 60; // garde-fou contre une date de fin mal saisie

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fusionne événements indépendants et tâches à échéance en une liste unique. */
export function buildAgenda(events: CalendarEvent[], tasks: Task[]): AgendaItem[] {
  const eventItems: AgendaItem[] = events.map((e) => ({
    id: `event:${e.id}`,
    title: e.title,
    date: e.date,
    endDate: e.endDate,
    time: e.time,
    description: e.description,
    kind: "event",
  }));

  const taskItems: AgendaItem[] = tasks
    .filter((t) => t.dueDate)
    .map((t) => ({
      id: `task:${t.id}`,
      title: t.title,
      date: t.dueDate!,
      description: t.description,
      kind: "task",
      taskStatus: t.status,
      taskAssignee: t.assignee,
      taskTagId: t.tagId,
    }));

  return [...eventItems, ...taskItems].sort((a, b) => a.date.localeCompare(b.date));
}

function eachDateInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  let guard = 0;
  while (cursor.getTime() <= last.getTime() && guard < MAX_MULTIDAY_SPAN) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard++;
  }
  return dates;
}

/** Groupe les items par date ISO — un événement multi-jours apparaît à chaque date de son intervalle. */
export function groupAgendaByDate(items: AgendaItem[]): Map<string, AgendaItem[]> {
  const map = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const dates = item.endDate ? eachDateInRange(item.date, item.endDate) : [item.date];
    for (const date of dates) {
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(item);
    }
  }
  return map;
}

/** Prochains éléments à venir (tâches déjà faites exclues), triés par date. */
export function getUpcomingAgenda(items: AgendaItem[], limit = 3): AgendaItem[] {
  const today = todayIso();
  return items
    .filter((item) => item.date >= today)
    .filter((item) => item.kind !== "task" || item.taskStatus !== "fait")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}
