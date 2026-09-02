// Calculs du module Budget : découpage par semaine ISO 8601, prorata du
// prévisionnel mensuel sur les semaines qui chevauchent deux mois,
// agrégations par catégorie, et estimation carburant reliée au module Carte.

import { getCachedSegment, listStops } from "./db";
import type { BudgetPlan, Category, Expense } from "./types";

// -- Semaines ISO 8601 (lundi → dimanche) -----------------------------------

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function getIsoWeekKey(dateStr: string): string {
  const d = toUtcDate(dateStr);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getIsoWeekRange(weekKey: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4DayOfWeek - 1) + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday, end: sunday };
}

export function formatWeekLabel(weekKey: string): string {
  const { start, end } = getIsoWeekRange(weekKey);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function dateToMonthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// -- Agrégations -------------------------------------------------------------

export function expensesInMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((e) => e.date.startsWith(month));
}

export function totalsByCategory(
  expenses: Expense[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amountEUR);
  }
  return totals;
}

/** D'où vient un prorata : le mois source et son budget mensuel plein. */
export interface ProratedSource {
  month: string;
  monthlyAmountEUR: number;
}

export interface WeeklyCategoryRow {
  categoryId: string;
  reelEUR: number;
  prevuEUR: number;
  /** Mois dont le budget mensuel a été proratisé pour obtenir prevuEUR (1 sauf semaine à cheval sur 2 mois). */
  prevuSources: ProratedSource[];
}

export interface WeeklyRecapRow {
  weekKey: string;
  label: string;
  categories: WeeklyCategoryRow[];
  totalReel: number;
  totalPrevu: number;
}

/**
 * Prorata du prévisionnel mensuel sur une semaine donnée : on additionne,
 * jour par jour, la part quotidienne du budget du mois auquel appartient
 * chaque jour — ce qui gère nativement les semaines à cheval sur deux mois.
 */
interface ProratedEntry {
  amountEUR: number;
  sources: ProratedSource[];
}

function proratedBudgetForWeek(
  weekKey: string,
  categoryIds: string[],
  plansByMonthAndCategory: Map<string, Map<string, number>>,
): Map<string, ProratedEntry> {
  const { start } = getIsoWeekRange(weekKey);
  const prorated = new Map<string, ProratedEntry>();

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const monthKey = dateToMonthKey(day);
    const monthPlans = plansByMonthAndCategory.get(monthKey);
    if (!monthPlans) continue;
    const totalDays = daysInMonth(monthKey);
    for (const categoryId of categoryIds) {
      const monthlyAmount = monthPlans.get(categoryId);
      if (!monthlyAmount) continue;
      const dailyShare = monthlyAmount / totalDays;

      const entry = prorated.get(categoryId) ?? { amountEUR: 0, sources: [] };
      entry.amountEUR += dailyShare;
      if (!entry.sources.some((s) => s.month === monthKey)) {
        entry.sources.push({ month: monthKey, monthlyAmountEUR: monthlyAmount });
      }
      prorated.set(categoryId, entry);
    }
  }

  return prorated;
}

/** Construit le récap hebdomadaire (réel vs prévisionnel prorata) pour toutes les semaines ayant au moins une dépense. */
export function buildWeeklyRecap(
  expenses: Expense[],
  budgetPlans: BudgetPlan[],
  categories: Category[],
): WeeklyRecapRow[] {
  const categoryIds = categories.map((c) => c.id);

  const plansByMonthAndCategory = new Map<string, Map<string, number>>();
  for (const plan of budgetPlans) {
    if (!plansByMonthAndCategory.has(plan.month)) {
      plansByMonthAndCategory.set(plan.month, new Map());
    }
    plansByMonthAndCategory.get(plan.month)!.set(plan.categoryId, plan.amountEUR);
  }

  const expensesByWeek = new Map<string, Expense[]>();
  for (const e of expenses) {
    const weekKey = getIsoWeekKey(e.date);
    if (!expensesByWeek.has(weekKey)) expensesByWeek.set(weekKey, []);
    expensesByWeek.get(weekKey)!.push(e);
  }

  const weekKeys = Array.from(expensesByWeek.keys()).sort().reverse();

  return weekKeys.map((weekKey) => {
    const weekExpenses = expensesByWeek.get(weekKey)!;
    const reelByCategory = totalsByCategory(weekExpenses);
    const prevuByCategory = proratedBudgetForWeek(
      weekKey,
      categoryIds,
      plansByMonthAndCategory,
    );

    const involvedCategoryIds = new Set([
      ...reelByCategory.keys(),
      ...prevuByCategory.keys(),
    ]);

    const categoryRows: WeeklyCategoryRow[] = categoryIds
      .filter((id) => involvedCategoryIds.has(id))
      .map((categoryId) => ({
        categoryId,
        reelEUR: reelByCategory.get(categoryId) ?? 0,
        prevuEUR: prevuByCategory.get(categoryId)?.amountEUR ?? 0,
        prevuSources: prevuByCategory.get(categoryId)?.sources ?? [],
      }));

    return {
      weekKey,
      label: formatWeekLabel(weekKey),
      categories: categoryRows,
      totalReel: categoryRows.reduce((sum, r) => sum + r.reelEUR, 0),
      totalPrevu: categoryRows.reduce((sum, r) => sum + r.prevuEUR, 0),
    };
  });
}

// -- Lien avec le module Carte : coût carburant ------------------------------

/** Somme des distances des segments dont l'étape d'arrivée est marquée "visité". */
export async function getVisitedKm(): Promise<number> {
  const stops = await listStops();
  if (stops.length < 2) return 0;

  let totalMeters = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    if (to.status !== "visite") continue;
    const segment = await getCachedSegment(from.id, to.id);
    if (segment) totalMeters += segment.distanceMeters;
  }
  return totalMeters / 1000;
}

export function estimateFuelCost(
  visitedKm: number,
  vehicleConsumptionL100km: number,
  fuelPricePerLiter: number,
): number {
  return (visitedKm / 100) * vehicleConsumptionL100km * fuelPricePerLiter;
}
