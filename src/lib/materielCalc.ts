// Calculs du module Matériel : totaux de budget matériel (distinct du budget
// voyage mensuel du module Budget) et compteurs par statut.

import type { MaterielItem, MaterielItemStatus, TaskStatus } from "./types";

/**
 * Mapping de statut entre une tâche et l'item Matériel qu'elle référence
 * (Task.linkedMaterielItemId) — bijectif, partagé entre la couche de
 * stockage (db.ts, qui synchronise dans les deux sens à chaque
 * enregistrement) et l'UI (qui l'utilise pour aligner les deux au moment de
 * créer ou changer un lien).
 */
export const TASK_STATUS_TO_ITEM_STATUS: Record<TaskStatus, MaterielItemStatus> = {
  "a-faire": "a-acheter",
  "en-cours": "en-cours",
  fait: "achete",
};

export const ITEM_STATUS_TO_TASK_STATUS: Record<MaterielItemStatus, TaskStatus> = {
  "a-acheter": "a-faire",
  "en-cours": "en-cours",
  achete: "fait",
};

/** Prix total de tous les items, quel que soit leur statut. */
export function totalPriceEUR(items: MaterielItem[]): number {
  return items.reduce((sum, i) => sum + (i.priceEUR ?? 0), 0);
}

/** Prix des seuls items déjà achetés — la dépense réelle à date. */
export function spentPriceEUR(items: MaterielItem[]): number {
  return items
    .filter((i) => i.status === "achete")
    .reduce((sum, i) => sum + (i.priceEUR ?? 0), 0);
}

export interface MaterielCounts {
  aAcheter: number;
  enCours: number;
  achete: number;
}

export function countMaterielItems(items: MaterielItem[]): MaterielCounts {
  return {
    aAcheter: items.filter((i) => i.status === "a-acheter").length,
    enCours: items.filter((i) => i.status === "en-cours").length,
    achete: items.filter((i) => i.status === "achete").length,
  };
}

export function totalsByCategory(items: MaterielItem[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const i of items) {
    totals.set(i.categoryId, (totals.get(i.categoryId) ?? 0) + (i.priceEUR ?? 0));
  }
  return totals;
}

export const MATERIEL_STATUS_LABELS: Record<MaterielItemStatus, string> = {
  "a-acheter": "À acheter",
  "en-cours": "En cours",
  achete: "Acheté",
};
