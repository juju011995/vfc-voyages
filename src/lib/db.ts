// Couche de persistance — IndexedDB via idb-keyval.
// Toutes les données du module Carte (étapes, tracé GPX, réglages) vivent ici
// et restent lisibles/modifiables sans connexion réseau (seuls la recherche
// de destination et le calcul d'itinéraire nécessitent le réseau).

import { createStore, get, set, del, keys } from "idb-keyval";
import type {
  BudgetPlan,
  BudgetSettings,
  Category,
  ExchangeRates,
  Expense,
  GpxTrack,
  MapSettings,
  RouteSegment,
  Stop,
} from "./types";

// Un seul object store IndexedDB pour toute l'app : les clés préfixées par
// module évitent d'avoir à gérer des montées de version IndexedDB à chaque
// nouveau module (idb-keyval ne recrée les object stores qu'à la création
// de la base).
const store = createStore("vfc-voyages", "carte");

const STOPS_PREFIX = "stop:";
const SEGMENT_CACHE_PREFIX = "segment-cache:";
const GPX_TRACK_KEY = "gpx-track";
const MAP_SETTINGS_KEY = "map-settings";

const CATEGORY_PREFIX = "category:";
const BUDGET_PLAN_PREFIX = "budget-plan:";
const EXPENSE_PREFIX = "expense:";
const BUDGET_SETTINGS_KEY = "budget-settings";
const EXCHANGE_RATES_KEY = "exchange-rates";

function stopKey(id: string) {
  return `${STOPS_PREFIX}${id}`;
}

function segmentCacheKey(fromId: string, toId: string) {
  return `${SEGMENT_CACHE_PREFIX}${fromId}:${toId}`;
}

export async function listStops(): Promise<Stop[]> {
  const allKeys = await keys(store);
  const stopKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(STOPS_PREFIX),
  );
  const stops = await Promise.all(stopKeys.map((k) => get<Stop>(k, store)));
  return stops
    .filter((s): s is Stop => Boolean(s))
    .sort((a, b) => a.order - b.order);
}

export async function saveStop(stop: Stop): Promise<void> {
  await set(stopKey(stop.id), stop, store);
}

export async function saveStops(stops: Stop[]): Promise<void> {
  await Promise.all(stops.map((s) => set(stopKey(s.id), s, store)));
}

export async function deleteStop(id: string): Promise<void> {
  await del(stopKey(id), store);
  const allKeys = await keys(store);
  const relatedSegmentKeys = allKeys.filter(
    (k): k is string =>
      typeof k === "string" &&
      k.startsWith(SEGMENT_CACHE_PREFIX) &&
      k.includes(id),
  );
  await Promise.all(relatedSegmentKeys.map((k) => del(k, store)));
}

export async function getCachedSegment(
  fromId: string,
  toId: string,
): Promise<RouteSegment | undefined> {
  return get<RouteSegment>(segmentCacheKey(fromId, toId), store);
}

export async function cacheSegment(segment: RouteSegment): Promise<void> {
  await set(segmentCacheKey(segment.fromId, segment.toId), segment, store);
}

export async function getGpxTrack(): Promise<GpxTrack | undefined> {
  return get<GpxTrack>(GPX_TRACK_KEY, store);
}

export async function saveGpxTrack(track: GpxTrack): Promise<void> {
  await set(GPX_TRACK_KEY, track, store);
}

export async function clearGpxTrack(): Promise<void> {
  await del(GPX_TRACK_KEY, store);
}

const DEFAULT_MAP_SETTINGS: MapSettings = {
  mode: "planification",
  showGpxOverlay: true,
};

export async function getMapSettings(): Promise<MapSettings> {
  const settings = await get<MapSettings>(MAP_SETTINGS_KEY, store);
  return settings ?? DEFAULT_MAP_SETTINGS;
}

export async function saveMapSettings(settings: MapSettings): Promise<void> {
  await set(MAP_SETTINGS_KEY, settings, store);
}

// ---------------------------------------------------------------------------
// Module Budget

const DEFAULT_CATEGORY_NAMES = [
  "Carburant",
  "Courses",
  "Loisirs",
  "Péages / Parking / Camping",
  "Assurance",
  "Imprévus",
  "Charges diverses",
];

function categoryKey(id: string) {
  return `${CATEGORY_PREFIX}${id}`;
}

function budgetPlanKey(month: string, categoryId: string) {
  return `${BUDGET_PLAN_PREFIX}${month}:${categoryId}`;
}

function expenseKey(id: string) {
  return `${EXPENSE_PREFIX}${id}`;
}

/** Liste les catégories, en créant les catégories par défaut au premier appel. */
export async function listCategories(): Promise<Category[]> {
  const allKeys = await keys(store);
  const categoryKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(CATEGORY_PREFIX),
  );

  if (categoryKeys.length === 0) {
    const now = Date.now();
    const defaults: Category[] = DEFAULT_CATEGORY_NAMES.map((name) => ({
      id: crypto.randomUUID(),
      name,
      isDefault: true,
      createdAt: now,
    }));
    await Promise.all(defaults.map((c) => set(categoryKey(c.id), c, store)));
    return defaults;
  }

  const categories = await Promise.all(
    categoryKeys.map((k) => get<Category>(k, store)),
  );
  return categories
    .filter((c): c is Category => Boolean(c))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveCategory(category: Category): Promise<void> {
  await set(categoryKey(category.id), category, store);
}

export async function listBudgetPlans(month?: string): Promise<BudgetPlan[]> {
  const allKeys = await keys(store);
  const planKeys = allKeys.filter(
    (k): k is string =>
      typeof k === "string" &&
      k.startsWith(month ? `${BUDGET_PLAN_PREFIX}${month}:` : BUDGET_PLAN_PREFIX),
  );
  const plans = await Promise.all(planKeys.map((k) => get<BudgetPlan>(k, store)));
  return plans.filter((p): p is BudgetPlan => Boolean(p));
}

export async function saveBudgetPlan(plan: BudgetPlan): Promise<void> {
  await set(budgetPlanKey(plan.month, plan.categoryId), plan, store);
}

export async function listExpenses(): Promise<Expense[]> {
  const allKeys = await keys(store);
  const expenseKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(EXPENSE_PREFIX),
  );
  const expenses = await Promise.all(
    expenseKeys.map((k) => get<Expense>(k, store)),
  );
  return expenses
    .filter((e): e is Expense => Boolean(e))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export async function saveExpense(expense: Expense): Promise<void> {
  await set(expenseKey(expense.id), expense, store);
}

export async function deleteExpense(id: string): Promise<void> {
  await del(expenseKey(id), store);
}

const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  fuelPricePerLiter: 1.8,
  vehicleConsumptionL100km: 9,
};

export async function getBudgetSettings(): Promise<BudgetSettings> {
  const settings = await get<BudgetSettings>(BUDGET_SETTINGS_KEY, store);
  return settings ?? DEFAULT_BUDGET_SETTINGS;
}

export async function saveBudgetSettings(
  settings: BudgetSettings,
): Promise<void> {
  await set(BUDGET_SETTINGS_KEY, settings, store);
}

export async function getExchangeRates(): Promise<ExchangeRates | undefined> {
  return get<ExchangeRates>(EXCHANGE_RATES_KEY, store);
}

export async function saveExchangeRates(rates: ExchangeRates): Promise<void> {
  await set(EXCHANGE_RATES_KEY, rates, store);
}
