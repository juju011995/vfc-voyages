// Calculs du module Matériel : totaux de budget matériel (distinct du budget
// voyage mensuel du module Budget), compteurs par statut, et règles de
// cohérence entre le statut d'achat et le statut d'embarquement (checklist
// "à charger dans la cellule") — voir le commentaire sur
// MaterielEmbarkmentStatus dans types.ts.

import type {
  MaterielEmbarkmentStatus,
  MaterielItem,
  MaterielItemStatus,
  TaskStatus,
} from "./types";
import { MATERIEL_DEJA_POSSEDE_COLOR, STATUS_STAGE_COLOR, type StatusStage } from "./statusColors";

/**
 * Mapping de statut entre une tâche et l'item Matériel qu'elle référence
 * (Task.linkedMaterielItemId) — bijectif, partagé entre la couche de
 * stockage (db.ts, qui synchronise dans les deux sens à chaque
 * enregistrement) et l'UI (qui l'utilise pour aligner les deux au moment de
 * créer ou changer un lien). "deja-possede" n'a pas d'équivalent côté tâche
 * (une tâche ne sait pas "je l'ai déjà") : seul achete→fait et l'inverse
 * existent déjà, "deja-possede" est traité comme "fait" (plus rien à
 * acheter) si jamais un item lié à une tâche y passe.
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
  "deja-possede": "fait",
};

/** Prix total des items comptant pour le budget — "deja-possede" n'a jamais de prix et est explicitement exclu de tous les totaux. */
export function totalPriceEUR(items: MaterielItem[]): number {
  return items
    .filter((i) => i.status !== "deja-possede")
    .reduce((sum, i) => sum + (i.priceEUR ?? 0), 0);
}

/** Prix des seuls items déjà achetés — la dépense réelle à date ("deja-possede" n'est jamais une dépense). */
export function spentPriceEUR(items: MaterielItem[]): number {
  return items
    .filter((i) => i.status === "achete")
    .reduce((sum, i) => sum + (i.priceEUR ?? 0), 0);
}

export interface MaterielCounts {
  aAcheter: number;
  enCours: number;
  achete: number;
  dejaPossede: number;
}

export function countMaterielItems(items: MaterielItem[]): MaterielCounts {
  return {
    aAcheter: items.filter((i) => i.status === "a-acheter").length,
    enCours: items.filter((i) => i.status === "en-cours").length,
    achete: items.filter((i) => i.status === "achete").length,
    dejaPossede: items.filter((i) => i.status === "deja-possede").length,
  };
}

/** Totaux par catégorie — comme totalPriceEUR, "deja-possede" est exclu (jamais de prix compté). */
export function totalsByCategory(items: MaterielItem[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const i of items) {
    if (i.status === "deja-possede") continue;
    totals.set(i.categoryId, (totals.get(i.categoryId) ?? 0) + (i.priceEUR ?? 0));
  }
  return totals;
}

export const MATERIEL_STATUS_LABELS: Record<MaterielItemStatus, string> = {
  "a-acheter": "À acheter",
  "en-cours": "En cours",
  achete: "Acheté",
  "deja-possede": "Déjà possédé",
};

/** Statut d'achat en "étape" générique — pour la couleur partagée avec le module Tâches (voir statusColors.ts). Ne couvre pas "deja-possede", qui n'est pas une étape d'avancement : voir materielStatusColor. */
export function materielStatusStage(
  status: Exclude<MaterielItemStatus, "deja-possede">,
): StatusStage {
  if (status === "a-acheter") return "todo";
  if (status === "en-cours") return "in-progress";
  return "done";
}

/** Couleur d'affichage d'un statut d'achat, "deja-possede" compris (teinte sauge dédiée, pas une étape d'avancement). */
export function materielStatusColor(status: MaterielItemStatus): string {
  if (status === "deja-possede") return MATERIEL_DEJA_POSSEDE_COLOR;
  return STATUS_STAGE_COLOR[materielStatusStage(status)];
}

// -- Embarquement (checklist "à charger dans la cellule") -------------------

export const MATERIEL_EMBARKMENT_LABELS: Record<MaterielEmbarkmentStatus, string> = {
  "a-prendre": "À prendre",
  possede: "Possédé",
  installe: "Installé",
};

function embarkmentStage(status: MaterielEmbarkmentStatus): StatusStage {
  if (status === "a-prendre") return "todo";
  if (status === "possede") return "in-progress";
  return "done";
}

export function materielEmbarkmentColor(status: MaterielEmbarkmentStatus): string {
  return STATUS_STAGE_COLOR[embarkmentStage(status)];
}

/**
 * Valeur effective du statut d'embarquement d'un item — à utiliser PARTOUT
 * où on affiche/filtre/compte l'embarquement, jamais `item.embarkmentStatus`
 * directement : les items créés avant cette fonctionnalité n'ont pas ce
 * champ, et doivent se lire comme "à prendre", sauf s'ils sont déjà
 * "achete" (alors "possédé"), sans aucune migration de données nécessaire.
 */
export function effectiveEmbarkmentStatus(
  item: Pick<MaterielItem, "status" | "embarkmentStatus">,
): MaterielEmbarkmentStatus {
  if (item.embarkmentStatus) return item.embarkmentStatus;
  return item.status === "achete" ? "possede" : "a-prendre";
}

export interface MaterielEmbarkmentCounts {
  aPrendre: number;
  possede: number;
  installe: number;
}

export function countEmbarkment(items: MaterielItem[]): MaterielEmbarkmentCounts {
  const counts: MaterielEmbarkmentCounts = { aPrendre: 0, possede: 0, installe: 0 };
  for (const item of items) {
    const effective = effectiveEmbarkmentStatus(item);
    if (effective === "a-prendre") counts.aPrendre++;
    else if (effective === "possede") counts.possede++;
    else counts.installe++;
  }
  return counts;
}

// -- Règles de cohérence entre les deux statuts ------------------------------
//
// Appliquées à chaque changement de statut, quel que soit l'endroit d'où il
// vient (bouton rapide sur une carte, case de la checklist, formulaire
// d'édition, ou même la complétion d'une tâche liée) — voir db.ts
// (saveMaterielItem / saveTask) et MaterielPage.tsx.

/**
 * Répercute un changement de STATUT D'ACHAT sur l'embarquement :
 * - Acheté/Déjà possédé avec embarquement encore "à prendre" → avance à "possédé".
 * - Retour à "à acheter"/"en cours" → revient à "à prendre"...
 * - ...sauf si l'objet est déjà "installé" : jamais de régression automatique
 *   (on ne veut pas décocher silencieusement un objet déjà rangé juste parce
 *   que son statut d'achat a été corrigé après coup).
 */
export function embarkmentAfterPurchaseChange(
  currentEmbarkment: MaterielEmbarkmentStatus,
  newPurchaseStatus: MaterielItemStatus,
): MaterielEmbarkmentStatus {
  if (currentEmbarkment === "installe") return "installe";
  if (newPurchaseStatus === "achete" || newPurchaseStatus === "deja-possede") {
    return currentEmbarkment === "a-prendre" ? "possede" : currentEmbarkment;
  }
  return "a-prendre";
}

/**
 * Répercute un changement de STATUT D'EMBARQUEMENT sur l'achat : si on
 * marque un objet "possédé" ou "installé" alors que son achat est encore "à
 * acheter"/"en cours", l'achat passe automatiquement à "déjà possédé" (on a
 * forcément l'objet en main pour pouvoir le ranger). L'appelant doit
 * signaler ce changement automatique par un message discret, modifiable.
 */
export function purchaseAfterEmbarkmentChange(
  currentPurchaseStatus: MaterielItemStatus,
  newEmbarkmentStatus: MaterielEmbarkmentStatus,
): MaterielItemStatus {
  if (
    (newEmbarkmentStatus === "possede" || newEmbarkmentStatus === "installe") &&
    (currentPurchaseStatus === "a-acheter" || currentPurchaseStatus === "en-cours")
  ) {
    return "deja-possede";
  }
  return currentPurchaseStatus;
}
