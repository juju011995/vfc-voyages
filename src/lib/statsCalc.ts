// Calculs du module Statistiques — n'introduit aucune nouvelle donnée :
// agrège uniquement ce qui existe déjà dans Budget (Expense, BudgetPlan) et
// Carte (Stop, RouteSegment), pour des vues dans la durée que ces modules
// n'affichent pas eux-mêmes (Budget ne montre qu'un instantané du mois en
// cours ; Carte ne montre pas de répartition par pays).

import type { BudgetPlan, Expense, RouteSegment, Stop } from "./types";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export interface MonthlyBudgetPoint {
  /** "YYYY-MM" */
  month: string;
  label: string;
  spentEUR: number;
  prevuEUR: number;
}

/**
 * Dépenses réelles vs prévisionnel, mois par mois, sur tous les mois ayant
 * au moins une dépense ou un prévisionnel saisi (pas seulement le mois en
 * cours, contrairement à la vue d'ensemble du module Budget).
 */
export function buildMonthlyBudgetTrend(
  expenses: Expense[],
  budgetPlans: BudgetPlan[],
): MonthlyBudgetPoint[] {
  const months = new Set<string>();
  for (const e of expenses) months.add(e.date.slice(0, 7));
  for (const p of budgetPlans) months.add(p.month);

  return [...months].sort().map((month) => ({
    month,
    label: monthLabel(month),
    spentEUR: expenses
      .filter((e) => e.date.startsWith(month))
      .reduce((sum, e) => sum + e.amountEUR, 0),
    prevuEUR: budgetPlans
      .filter((p) => p.month === month)
      .reduce((sum, p) => sum + p.amountEUR, 0),
  }));
}

export interface CumulativeBudgetPoint {
  month: string;
  label: string;
  cumulativeSpentEUR: number;
  cumulativePrevuEUR: number;
}

/** Cumul dépensé vs cumul prévisionnel — pour voir si le voyage est globalement dans les clous, pas juste mois par mois. */
export function buildCumulativeBudgetTrend(
  monthly: MonthlyBudgetPoint[],
): CumulativeBudgetPoint[] {
  let spentAcc = 0;
  let prevuAcc = 0;
  return monthly.map((m) => {
    spentAcc += m.spentEUR;
    prevuAcc += m.prevuEUR;
    return {
      month: m.month,
      label: m.label,
      cumulativeSpentEUR: spentAcc,
      cumulativePrevuEUR: prevuAcc,
    };
  });
}

export interface KmByCountry {
  country: string;
  km: number;
}

/**
 * Kilomètres parcourus par pays, à partir des segments routés déjà en cache
 * (mêmes données que getVisitedKm dans budgetCalc.ts) — un segment compte
 * pour le pays de l'étape d'arrivée, seulement si elle est marquée visitée.
 * Aucun appel réseau : n'utilise que le cache, jamais un recalcul OSRM.
 */
export function buildKmByCountry(stops: Stop[], segments: RouteSegment[]): KmByCountry[] {
  const stopsById = new Map(stops.map((s) => [s.id, s]));
  const totals = new Map<string, number>();

  for (const segment of segments) {
    const to = stopsById.get(segment.toId);
    if (!to || to.status !== "visite") continue;
    const country = to.country ?? "Pays inconnu";
    totals.set(country, (totals.get(country) ?? 0) + segment.distanceMeters / 1000);
  }

  return [...totals.entries()]
    .map(([country, km]) => ({ country, km }))
    .sort((a, b) => b.km - a.km);
}
