// Couche de persistance — IndexedDB via idb-keyval.
// Toutes les données du module Carte (étapes, tracé GPX, réglages) vivent ici
// et restent lisibles/modifiables sans connexion réseau (seuls la recherche
// de destination et le calcul d'itinéraire nécessitent le réseau).

import { createStore, get, set, del, keys } from "idb-keyval";
import type {
  BorderRequirement,
  BudgetPlan,
  BudgetSettings,
  CalendarEvent,
  Category,
  ExchangeRates,
  Expense,
  GpxTrack,
  LokiDocument,
  MapSettings,
  RouteSegment,
  Stop,
  Task,
  TaskTag,
  Treatment,
  VetContact,
  WeightEntry,
} from "./types";
import { pickNextTagColor } from "./tagColors";
import { BORDER_CHECKLIST_BY_COUNTRY, LOKI_COUNTRIES } from "./lokiData";

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

const TASK_TAG_PREFIX = "task-tag:";
const TASK_PREFIX = "task:";
const CALENDAR_EVENT_PREFIX = "calendar-event:";

const LOKI_DOCUMENT_PREFIX = "loki-document:";
const WEIGHT_ENTRY_PREFIX = "weight-entry:";
const TREATMENT_PREFIX = "treatment:";
const VET_CONTACT_PREFIX = "vet-contact:";
const BORDER_REQUIREMENT_PREFIX = "border-requirement:";

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

async function readCategoriesRaw(): Promise<Category[]> {
  const allKeys = await keys(store);
  const categoryKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(CATEGORY_PREFIX),
  );
  const categories = await Promise.all(
    categoryKeys.map((k) => get<Category>(k, store)),
  );
  return categories
    .filter((c): c is Category => Boolean(c))
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function seedDefaultCategories(): Promise<Category[]> {
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

/**
 * Fusionne les catégories en double (même nom, à la casse/espaces près) :
 * conserve la plus ancienne, reporte ses dépenses et son prévisionnel sur
 * elle, puis supprime les doublons. Corrige aussi bien une éventuelle
 * ancienne donnée corrompue (double appel concurrent de seedDefaultCategories,
 * cf. React StrictMode) que tout doublon créé par erreur par l'utilisateur.
 */
async function dedupeCategories(categories: Category[]): Promise<Category[]> {
  const groups = new Map<string, Category[]>();
  for (const c of categories) {
    const key = c.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const duplicateGroups = Array.from(groups.values()).filter((g) => g.length > 1);
  if (duplicateGroups.length === 0) return categories;

  const [expenses, plans] = await Promise.all([listExpenses(), listBudgetPlans()]);

  for (const group of duplicateGroups) {
    const [keeper, ...duplicates] = [...group].sort(
      (a, b) => a.createdAt - b.createdAt,
    );

    for (const dup of duplicates) {
      const affectedExpenses = expenses.filter((e) => e.categoryId === dup.id);
      await Promise.all(
        affectedExpenses.map((e) => saveExpense({ ...e, categoryId: keeper.id })),
      );

      const affectedPlans = plans.filter((p) => p.categoryId === dup.id);
      for (const plan of affectedPlans) {
        const keeperHasPlanForMonth = plans.some(
          (p) => p.categoryId === keeper.id && p.month === plan.month,
        );
        if (!keeperHasPlanForMonth) {
          await saveBudgetPlan({ ...plan, id: crypto.randomUUID(), categoryId: keeper.id });
        }
        await del(budgetPlanKey(plan.month, dup.id), store);
      }

      await del(categoryKey(dup.id), store);
    }
  }

  return readCategoriesRaw();
}

// Empêche deux appels concurrents (ex. double montage d'effet en React
// StrictMode) de semer chacun leur propre jeu de catégories par défaut.
let categoriesSeedPromise: Promise<Category[]> | null = null;

/** Liste les catégories, en créant les catégories par défaut au premier appel. */
export async function listCategories(): Promise<Category[]> {
  const existing = await readCategoriesRaw();

  if (existing.length === 0) {
    if (!categoriesSeedPromise) {
      categoriesSeedPromise = seedDefaultCategories();
    }
    return categoriesSeedPromise;
  }

  return dedupeCategories(existing);
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

// ---------------------------------------------------------------------------
// Module Tâches

const DEFAULT_TASK_TAG_NAMES = ["Administratif", "Cellule", "Loki", "Van/Hilux"];

function taskTagKey(id: string) {
  return `${TASK_TAG_PREFIX}${id}`;
}

function taskKey(id: string) {
  return `${TASK_PREFIX}${id}`;
}

async function readTaskTagsRaw(): Promise<TaskTag[]> {
  const allKeys = await keys(store);
  const tagKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(TASK_TAG_PREFIX),
  );
  const tags = await Promise.all(tagKeys.map((k) => get<TaskTag>(k, store)));
  return tags
    .filter((t): t is TaskTag => Boolean(t))
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function seedDefaultTaskTags(): Promise<TaskTag[]> {
  const now = Date.now();
  const usedColors: Array<string | undefined> = [];
  const defaults: TaskTag[] = DEFAULT_TASK_TAG_NAMES.map((name) => {
    const color = pickNextTagColor(usedColors);
    usedColors.push(color);
    return { id: crypto.randomUUID(), name, isDefault: true, color, createdAt: now };
  });
  await Promise.all(defaults.map((t) => set(taskTagKey(t.id), t, store)));
  return defaults;
}

/** Attribue une couleur pastel aux tags qui n'en ont pas encore (données antérieures à cette fonctionnalité). */
async function backfillTagColors(tags: TaskTag[]): Promise<TaskTag[]> {
  if (tags.every((t) => t.color)) return tags;

  const usedColors = tags.map((t) => t.color);
  const updated: TaskTag[] = [];
  for (const tag of tags) {
    if (tag.color) {
      updated.push(tag);
      continue;
    }
    const color = pickNextTagColor(usedColors);
    usedColors.push(color);
    const withColor: TaskTag = { ...tag, color };
    await set(taskTagKey(tag.id), withColor, store);
    updated.push(withColor);
  }
  return updated;
}

/**
 * Fusionne les tags en double (même nom, à la casse/espaces près) : conserve
 * le plus ancien, reporte les tâches qui pointent vers les doublons, puis les
 * supprime. Même correctif que pour les catégories du Budget (cf.
 * dedupeCategories) contre un double appel concurrent de seedDefaultTaskTags.
 */
async function dedupeTaskTags(tags: TaskTag[]): Promise<TaskTag[]> {
  const groups = new Map<string, TaskTag[]>();
  for (const t of tags) {
    const key = t.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const duplicateGroups = Array.from(groups.values()).filter((g) => g.length > 1);
  if (duplicateGroups.length === 0) return tags;

  const tasks = await listTasks();

  for (const group of duplicateGroups) {
    const [keeper, ...duplicates] = [...group].sort(
      (a, b) => a.createdAt - b.createdAt,
    );

    for (const dup of duplicates) {
      const affectedTasks = tasks.filter((t) => t.tagId === dup.id);
      await Promise.all(
        affectedTasks.map((t) => saveTask({ ...t, tagId: keeper.id })),
      );
      await del(taskTagKey(dup.id), store);
    }
  }

  return readTaskTagsRaw();
}

// Empêche deux appels concurrents (ex. double montage d'effet en React
// StrictMode) de semer chacun leur propre jeu de tags par défaut.
let taskTagsSeedPromise: Promise<TaskTag[]> | null = null;

/** Liste les tags de tâche, en créant les tags par défaut au premier appel. */
export async function listTaskTags(): Promise<TaskTag[]> {
  const existing = await readTaskTagsRaw();

  if (existing.length === 0) {
    if (!taskTagsSeedPromise) {
      taskTagsSeedPromise = seedDefaultTaskTags();
    }
    return taskTagsSeedPromise;
  }

  const deduped = await dedupeTaskTags(existing);
  return backfillTagColors(deduped);
}

export async function saveTaskTag(tag: TaskTag): Promise<void> {
  await set(taskTagKey(tag.id), tag, store);
}

export async function listTasks(): Promise<Task[]> {
  const allKeys = await keys(store);
  const taskKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(TASK_PREFIX),
  );
  const tasks = await Promise.all(taskKeys.map((k) => get<Task>(k, store)));
  return tasks.filter((t): t is Task => Boolean(t));
}

export async function saveTask(task: Task): Promise<void> {
  await set(taskKey(task.id), task, store);
}

export async function deleteTask(id: string): Promise<void> {
  await del(taskKey(id), store);
}

// ---------------------------------------------------------------------------
// Module Calendrier

function calendarEventKey(id: string) {
  return `${CALENDAR_EVENT_PREFIX}${id}`;
}

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const allKeys = await keys(store);
  const eventKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(CALENDAR_EVENT_PREFIX),
  );
  const events = await Promise.all(
    eventKeys.map((k) => get<CalendarEvent>(k, store)),
  );
  return events
    .filter((e): e is CalendarEvent => Boolean(e))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveCalendarEvent(event: CalendarEvent): Promise<void> {
  await set(calendarEventKey(event.id), event, store);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await del(calendarEventKey(id), store);
}

// ---------------------------------------------------------------------------
// Module Loki

function lokiDocumentKey(id: string) {
  return `${LOKI_DOCUMENT_PREFIX}${id}`;
}

function weightEntryKey(id: string) {
  return `${WEIGHT_ENTRY_PREFIX}${id}`;
}

function treatmentKey(id: string) {
  return `${TREATMENT_PREFIX}${id}`;
}

function vetContactKey(id: string) {
  return `${VET_CONTACT_PREFIX}${id}`;
}

function borderRequirementKey(country: string) {
  return `${BORDER_REQUIREMENT_PREFIX}${country}`;
}

export async function listLokiDocuments(): Promise<LokiDocument[]> {
  const allKeys = await keys(store);
  const docKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(LOKI_DOCUMENT_PREFIX),
  );
  const docs = await Promise.all(docKeys.map((k) => get<LokiDocument>(k, store)));
  return docs
    .filter((d): d is LokiDocument => Boolean(d))
    .sort((a, b) => (a.dueDate ?? a.date ?? "").localeCompare(b.dueDate ?? b.date ?? ""));
}

export async function saveLokiDocument(doc: LokiDocument): Promise<void> {
  await set(lokiDocumentKey(doc.id), doc, store);
}

export async function deleteLokiDocument(id: string): Promise<void> {
  await del(lokiDocumentKey(id), store);
}

export async function listWeightEntries(): Promise<WeightEntry[]> {
  const allKeys = await keys(store);
  const entryKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(WEIGHT_ENTRY_PREFIX),
  );
  const entries = await Promise.all(entryKeys.map((k) => get<WeightEntry>(k, store)));
  return entries
    .filter((e): e is WeightEntry => Boolean(e))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveWeightEntry(entry: WeightEntry): Promise<void> {
  await set(weightEntryKey(entry.id), entry, store);
}

export async function deleteWeightEntry(id: string): Promise<void> {
  await del(weightEntryKey(id), store);
}

export async function listTreatments(): Promise<Treatment[]> {
  const allKeys = await keys(store);
  const treatmentKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(TREATMENT_PREFIX),
  );
  const treatments = await Promise.all(treatmentKeys.map((k) => get<Treatment>(k, store)));
  return treatments
    .filter((t): t is Treatment => Boolean(t))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveTreatment(treatment: Treatment): Promise<void> {
  await set(treatmentKey(treatment.id), treatment, store);
}

export async function deleteTreatment(id: string): Promise<void> {
  await del(treatmentKey(id), store);
}

function defaultVetId(country: string) {
  return `default-${country}`;
}

/**
 * Liste les vétérinaires, en complétant automatiquement une fiche par pays
 * de l'itinéraire type si elle n'existe pas encore. Identifiants
 * déterministes (un par pays) : un double appel concurrent réécrit la même
 * fiche au lieu d'en créer une en double.
 */
export async function listVetContacts(): Promise<VetContact[]> {
  const allKeys = await keys(store);
  const vetKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(VET_CONTACT_PREFIX),
  );
  const existing = await Promise.all(vetKeys.map((k) => get<VetContact>(k, store)));
  let list = existing.filter((v): v is VetContact => Boolean(v));

  const prefilledCountries = new Set(list.filter((v) => v.prefilled).map((v) => v.country));
  const missing = LOKI_COUNTRIES.filter((c) => !prefilledCountries.has(c));
  if (missing.length > 0) {
    const now = Date.now();
    const toCreate: VetContact[] = missing.map((country) => ({
      id: defaultVetId(country),
      country,
      prefilled: true,
      createdAt: now,
      updatedAt: now,
    }));
    await Promise.all(toCreate.map((v) => set(vetContactKey(v.id), v, store)));
    list = [...list, ...toCreate];
  }

  return list.sort(
    (a, b) => a.country.localeCompare(b.country) || (a.city ?? "").localeCompare(b.city ?? ""),
  );
}

export async function saveVetContact(contact: VetContact): Promise<void> {
  await set(vetContactKey(contact.id), contact, store);
}

export async function deleteVetContact(id: string): Promise<void> {
  await del(vetContactKey(id), store);
}

/**
 * Liste les exigences frontalières, une fiche par pays — pré-remplies à
 * partir de BORDER_CHECKLIST_BY_COUNTRY si absentes. Id = nom du pays, donc
 * naturellement idempotent (pas de garde anti-doublon nécessaire).
 */
export async function listBorderRequirements(): Promise<BorderRequirement[]> {
  const allKeys = await keys(store);
  const reqKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(BORDER_REQUIREMENT_PREFIX),
  );
  const existing = await Promise.all(reqKeys.map((k) => get<BorderRequirement>(k, store)));
  let list = existing.filter((r): r is BorderRequirement => Boolean(r));

  const existingCountries = new Set(list.map((r) => r.country));
  const missing = LOKI_COUNTRIES.filter((c) => !existingCountries.has(c));
  if (missing.length > 0) {
    const now = Date.now();
    const toCreate: BorderRequirement[] = missing.map((country) => ({
      id: country,
      country,
      items: (BORDER_CHECKLIST_BY_COUNTRY[country] ?? []).map((label, i) => ({
        id: `${country}-${i}`,
        label,
        done: false,
      })),
      updatedAt: now,
    }));
    await Promise.all(toCreate.map((r) => set(borderRequirementKey(r.id), r, store)));
    list = [...list, ...toCreate];
  }

  return list.sort((a, b) => a.country.localeCompare(b.country));
}

export async function saveBorderRequirement(req: BorderRequirement): Promise<void> {
  await set(borderRequirementKey(req.id), req, store);
}
