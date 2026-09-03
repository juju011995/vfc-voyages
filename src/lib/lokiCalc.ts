// Calculs du module Loki — prochaine échéance (documents + traitements,
// pour le Dashboard) et tendance de poids.

import type { LokiDocument, Treatment, WeightEntry } from "./types";

export interface UpcomingLokiDeadline {
  id: string;
  title: string;
  dueDate: string;
  kind: "document" | "traitement";
  overdue: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Prochaines échéances (documents à renouveler, traitements à refaire), triées par date. */
export function getUpcomingLokiDeadlines(
  documents: LokiDocument[],
  treatments: Treatment[],
  limit = 5,
): UpcomingLokiDeadline[] {
  const today = todayIso();

  const docDeadlines: UpcomingLokiDeadline[] = documents
    .filter((d) => d.dueDate)
    .map((d) => ({
      id: `document:${d.id}`,
      title: d.title,
      dueDate: d.dueDate!,
      kind: "document",
      overdue: d.dueDate! < today,
    }));

  const treatmentDeadlines: UpcomingLokiDeadline[] = treatments
    .filter((t) => t.nextDueDate)
    .map((t) => ({
      id: `treatment:${t.id}`,
      title: t.product ? `${t.product} (rappel)` : "Traitement (rappel)",
      dueDate: t.nextDueDate!,
      kind: "traitement",
      overdue: t.nextDueDate! < today,
    }));

  return [...docDeadlines, ...treatmentDeadlines]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit);
}

export interface WeightTrend {
  latestKg: number;
  latestDate: string;
  /** Différence avec la mesure précédente, en kg (undefined si une seule mesure). */
  deltaKg?: number;
}

/** Dernière mesure de poids et évolution par rapport à la précédente. */
export function getWeightTrend(entries: WeightEntry[]): WeightTrend | undefined {
  if (entries.length === 0) return undefined;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
  return {
    latestKg: latest.weightKg,
    latestDate: latest.date,
    deltaKg: previous ? Math.round((latest.weightKg - previous.weightKg) * 10) / 10 : undefined,
  };
}
