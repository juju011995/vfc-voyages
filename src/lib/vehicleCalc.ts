// Calculs du module Véhicule — échéances d'entretien calculées à partir du
// kilométrage réel du véhicule (pas seulement les km parcourus depuis le
// début du voyage, cf. le commentaire "Module Véhicule" dans types.ts) et
// de l'intervalle habituel défini par type.

import { getVisitedKm } from "./budgetCalc";
import type { MaintenanceLog, MaintenanceType, VehicleSettings } from "./types";

/** Kilométrage réel actuel du véhicule = kilométrage de départ + km parcourus depuis le début du voyage. */
export async function computeCurrentOdometerKm(settings: VehicleSettings): Promise<number> {
  const tripKm = await getVisitedKm();
  return settings.startingOdometerKm + tripKm;
}

export type MaintenanceUrgency = "ok" | "due-soon" | "overdue";

export interface MaintenanceStatus {
  type: MaintenanceType;
  /** Intervention la plus récente pour ce type — absente si jamais renseignée. */
  lastLog?: MaintenanceLog;
  /** Absent si le type n'a pas d'intervalle défini (pas d'échéance calculable). */
  nextDueKm?: number;
  /** Négatif si l'échéance est dépassée. */
  remainingKm?: number;
  urgency: MaintenanceUrgency;
}

/** Fenêtre d'alerte "bientôt" — proportionnelle à l'intervalle, avec un plancher pour les intervalles courts. */
function warningWindowKm(intervalKm: number): number {
  return Math.max(500, intervalKm * 0.1);
}

/**
 * Calcule le statut de chaque type d'entretien actif : dernière intervention,
 * prochaine échéance et urgence. Un type jamais renseigné est traité comme
 * dû dès maintenant (mieux vaut inviter à renseigner la dernière intervention
 * réelle que de supposer, à tort, que tout est à jour).
 */
export function buildMaintenanceStatuses(
  types: MaintenanceType[],
  logs: MaintenanceLog[],
  currentOdometerKm: number,
): MaintenanceStatus[] {
  return types
    .filter((t) => !t.archived)
    .map((type) => {
      const typeLogs = logs.filter((l) => l.typeId === type.id).sort((a, b) => b.km - a.km);
      const lastLog = typeLogs[0];

      if (!type.intervalKm) {
        return { type, lastLog, urgency: "ok" as const };
      }

      const baseKm = lastLog?.km ?? 0;
      const nextDueKm = baseKm + type.intervalKm;
      const remainingKm = nextDueKm - currentOdometerKm;
      const urgency: MaintenanceUrgency =
        remainingKm <= 0
          ? "overdue"
          : remainingKm <= warningWindowKm(type.intervalKm)
            ? "due-soon"
            : "ok";

      return { type, lastLog, nextDueKm, remainingKm, urgency };
    })
    .sort((a, b) => {
      const urgencyWeight: Record<MaintenanceUrgency, number> = { overdue: 0, "due-soon": 1, ok: 2 };
      const weightDiff = urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
      if (weightDiff !== 0) return weightDiff;
      return (a.remainingKm ?? Infinity) - (b.remainingKm ?? Infinity);
    });
}

export const MAINTENANCE_URGENCY_LABELS: Record<MaintenanceUrgency, string> = {
  ok: "À jour",
  "due-soon": "Bientôt",
  overdue: "Dépassé",
};
