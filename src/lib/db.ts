// Couche de persistance — IndexedDB via idb-keyval.
// Toutes les données du module Carte (étapes, tracé GPX, réglages) vivent ici
// et restent lisibles/modifiables sans connexion réseau (seuls la recherche
// de destination et le calcul d'itinéraire nécessitent le réseau).

import { createStore, get, set, setMany, del, keys, clear } from "idb-keyval";
import type {
  AppSettings,
  BorderRequirement,
  BudgetPlan,
  BudgetSettings,
  CalendarEvent,
  Category,
  ExchangeRates,
  Expense,
  GpxTrack,
  LokiCountrySettings,
  LokiDocument,
  MapSettings,
  MaterielCategory,
  MaterielItem,
  RouteSegment,
  Stop,
  Task,
  TaskTag,
  Treatment,
  VetContact,
  WeightEntry,
} from "./types";
import { pickNextTagColor } from "./tagColors";
import { getBorderChecklistFor } from "./lokiData";
import { ITEM_STATUS_TO_TASK_STATUS, TASK_STATUS_TO_ITEM_STATUS } from "./materielCalc";

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
const LOKI_COUNTRY_SETTINGS_KEY = "loki-country-settings";

const MATERIEL_CATEGORY_PREFIX = "materiel-category:";
const MATERIEL_ITEM_PREFIX = "materiel-item:";

function materielItemKey(id: string) {
  return `${MATERIEL_ITEM_PREFIX}${id}`;
}

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

/**
 * Enregistre une tâche et, si elle est liée à un item Matériel
 * (linkedMaterielItemId), propage son statut vers cet item — voir le
 * commentaire "Module Matériel" dans types.ts. Écriture directe (pas
 * d'appel à saveMaterielItem) pour ne jamais boucler entre les deux.
 */
export async function saveTask(task: Task): Promise<void> {
  await set(taskKey(task.id), task, store);
  if (task.linkedMaterielItemId) {
    const item = await get<MaterielItem>(materielItemKey(task.linkedMaterielItemId), store);
    const mappedStatus = TASK_STATUS_TO_ITEM_STATUS[task.status];
    if (item && item.status !== mappedStatus) {
      await set(
        materielItemKey(item.id),
        { ...item, status: mappedStatus, updatedAt: Date.now() },
        store,
      );
    }
  }
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
 * demandé (voir computeVisibleCountries) si elle n'existe pas encore.
 * Identifiants déterministes (un par pays) : un double appel concurrent
 * réécrit la même fiche au lieu d'en créer une en double. Les fiches déjà
 * saisies pour un pays qui n'est plus demandé sont conservées telles
 * quelles — cette fonction ne supprime jamais rien.
 */
export async function listVetContacts(desiredCountries: string[]): Promise<VetContact[]> {
  const allKeys = await keys(store);
  const vetKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(VET_CONTACT_PREFIX),
  );
  const existing = await Promise.all(vetKeys.map((k) => get<VetContact>(k, store)));
  let list = existing.filter((v): v is VetContact => Boolean(v));

  const prefilledCountries = new Set(list.filter((v) => v.prefilled).map((v) => v.country));
  const missing = desiredCountries.filter((c) => !prefilledCountries.has(c));
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
 * Liste les exigences frontalières, une fiche par pays demandé (voir
 * computeVisibleCountries) — pré-remplies à partir de getBorderChecklistFor
 * si absentes. Id = nom du pays, donc naturellement idempotent (pas de garde
 * anti-doublon nécessaire). Les fiches déjà saisies pour un pays qui n'est
 * plus demandé sont conservées telles quelles.
 */
export async function listBorderRequirements(
  desiredCountries: string[],
): Promise<BorderRequirement[]> {
  const allKeys = await keys(store);
  const reqKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(BORDER_REQUIREMENT_PREFIX),
  );
  const existing = await Promise.all(reqKeys.map((k) => get<BorderRequirement>(k, store)));
  let list = existing.filter((r): r is BorderRequirement => Boolean(r));

  const existingCountries = new Set(list.map((r) => r.country));
  const missing = desiredCountries.filter((c) => !existingCountries.has(c));
  if (missing.length > 0) {
    const now = Date.now();
    const toCreate: BorderRequirement[] = missing.map((country) => ({
      id: country,
      country,
      items: getBorderChecklistFor(country).map((label, i) => ({
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

const DEFAULT_LOKI_COUNTRY_SETTINGS: LokiCountrySettings = {
  manuallyAdded: [],
  manuallyRemoved: [],
};

export async function getLokiCountrySettings(): Promise<LokiCountrySettings> {
  const settings = await get<LokiCountrySettings>(LOKI_COUNTRY_SETTINGS_KEY, store);
  return settings ?? DEFAULT_LOKI_COUNTRY_SETTINGS;
}

export async function saveLokiCountrySettings(settings: LokiCountrySettings): Promise<void> {
  await set(LOKI_COUNTRY_SETTINGS_KEY, settings, store);
}

// ---------------------------------------------------------------------------
// Module Matériel

const DEFAULT_MATERIEL_CATEGORY_NAMES = [
  "Cellule",
  "Cuisine",
  "Loki",
  "Outils",
  "Vêtements",
  "Électricité",
];

function materielCategoryKey(id: string) {
  return `${MATERIEL_CATEGORY_PREFIX}${id}`;
}

async function readMaterielCategoriesRaw(): Promise<MaterielCategory[]> {
  const allKeys = await keys(store);
  const categoryKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(MATERIEL_CATEGORY_PREFIX),
  );
  const categories = await Promise.all(
    categoryKeys.map((k) => get<MaterielCategory>(k, store)),
  );
  return categories
    .filter((c): c is MaterielCategory => Boolean(c))
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function seedDefaultMaterielCategories(): Promise<MaterielCategory[]> {
  const now = Date.now();
  const usedColors: Array<string | undefined> = [];
  const defaults: MaterielCategory[] = DEFAULT_MATERIEL_CATEGORY_NAMES.map((name) => {
    const color = pickNextTagColor(usedColors);
    usedColors.push(color);
    return { id: crypto.randomUUID(), name, isDefault: true, color, createdAt: now };
  });
  await Promise.all(defaults.map((c) => set(materielCategoryKey(c.id), c, store)));
  return defaults;
}

/** Même correctif anti-doublon que pour les catégories Budget et les tags de tâches (cf. dedupeCategories). */
async function dedupeMaterielCategories(categories: MaterielCategory[]): Promise<MaterielCategory[]> {
  const groups = new Map<string, MaterielCategory[]>();
  for (const c of categories) {
    const key = c.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const duplicateGroups = Array.from(groups.values()).filter((g) => g.length > 1);
  if (duplicateGroups.length === 0) return categories;

  const items = await listMaterielItems();

  for (const group of duplicateGroups) {
    const [keeper, ...duplicates] = [...group].sort(
      (a, b) => a.createdAt - b.createdAt,
    );

    for (const dup of duplicates) {
      const affectedItems = items.filter((i) => i.categoryId === dup.id);
      await Promise.all(
        affectedItems.map((i) => saveMaterielItem({ ...i, categoryId: keeper.id })),
      );
      await del(materielCategoryKey(dup.id), store);
    }
  }

  return readMaterielCategoriesRaw();
}

/** Attribue une couleur pastel aux catégories qui n'en ont pas encore (données antérieures à cette fonctionnalité). */
async function backfillMaterielCategoryColors(
  categories: MaterielCategory[],
): Promise<MaterielCategory[]> {
  if (categories.every((c) => c.color)) return categories;

  const usedColors = categories.map((c) => c.color);
  const updated: MaterielCategory[] = [];
  for (const category of categories) {
    if (category.color) {
      updated.push(category);
      continue;
    }
    const color = pickNextTagColor(usedColors);
    usedColors.push(color);
    const withColor: MaterielCategory = { ...category, color };
    await set(materielCategoryKey(category.id), withColor, store);
    updated.push(withColor);
  }
  return updated;
}

// Empêche deux appels concurrents (ex. double montage d'effet en React
// StrictMode) de semer chacun leur propre jeu de catégories par défaut.
let materielCategoriesSeedPromise: Promise<MaterielCategory[]> | null = null;

/** Liste les catégories Matériel, en créant les catégories par défaut au premier appel. */
export async function listMaterielCategories(): Promise<MaterielCategory[]> {
  const existing = await readMaterielCategoriesRaw();

  if (existing.length === 0) {
    if (!materielCategoriesSeedPromise) {
      materielCategoriesSeedPromise = seedDefaultMaterielCategories();
    }
    return materielCategoriesSeedPromise;
  }

  const deduped = await dedupeMaterielCategories(existing);
  return backfillMaterielCategoryColors(deduped);
}

export async function saveMaterielCategory(category: MaterielCategory): Promise<void> {
  await set(materielCategoryKey(category.id), category, store);
}

export async function listMaterielItems(): Promise<MaterielItem[]> {
  const allKeys = await keys(store);
  const itemKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(MATERIEL_ITEM_PREFIX),
  );
  const items = await Promise.all(itemKeys.map((k) => get<MaterielItem>(k, store)));
  return items
    .filter((i): i is MaterielItem => Boolean(i))
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function findTaskLinkedToItem(itemId: string): Promise<Task | undefined> {
  const tasks = await listTasks();
  return tasks.find((t) => t.linkedMaterielItemId === itemId);
}

/**
 * Enregistre un item et, s'il est lié à une tâche (une tâche dont
 * linkedMaterielItemId pointe vers cet item), propage son statut vers cette
 * tâche. Écriture directe (pas d'appel à saveTask) pour ne jamais boucler
 * entre les deux — voir le commentaire "Module Matériel" dans types.ts.
 */
export async function saveMaterielItem(item: MaterielItem): Promise<void> {
  await set(materielItemKey(item.id), item, store);
  const linkedTask = await findTaskLinkedToItem(item.id);
  if (linkedTask) {
    const mappedStatus = ITEM_STATUS_TO_TASK_STATUS[item.status];
    if (linkedTask.status !== mappedStatus) {
      await set(
        taskKey(linkedTask.id),
        { ...linkedTask, status: mappedStatus, updatedAt: Date.now() },
        store,
      );
    }
  }
}

/** Supprime un item et détache la tâche qui lui était éventuellement liée (jamais la tâche elle-même). */
export async function deleteMaterielItem(id: string): Promise<void> {
  await del(materielItemKey(id), store);
  const linkedTask = await findTaskLinkedToItem(id);
  if (linkedTask) {
    const { linkedMaterielItemId, ...rest } = linkedTask;
    await set(taskKey(linkedTask.id), { ...rest, updatedAt: Date.now() }, store);
  }
}

// ---------------------------------------------------------------------------
// Module Paramètres

const APP_SETTINGS_KEY = "app-settings";

const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultCurrency: "EUR",
  profileNames: { justine: "Justine", nathan: "Nathan" },
};

/** Fusionne avec les valeurs par défaut pour rester tolérant à un futur champ ajouté à AppSettings. */
export async function getAppSettings(): Promise<AppSettings> {
  const settings = await get<AppSettings>(APP_SETTINGS_KEY, store);
  if (!settings) return DEFAULT_APP_SETTINGS;
  return {
    ...DEFAULT_APP_SETTINGS,
    ...settings,
    profileNames: { ...DEFAULT_APP_SETTINGS.profileNames, ...settings.profileNames },
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await set(APP_SETTINGS_KEY, settings, store);
}

/**
 * Exporte l'intégralité des données de l'app (toutes les clés du store
 * IndexedDB unique, cf. commentaire en tête de fichier) — pour la
 * sauvegarde manuelle proposée dans Paramètres. Pas de désérialisation
 * particulière : chaque module sait déjà lire ses propres clés préfixées.
 */
export async function exportAllData(): Promise<Record<string, unknown>> {
  const allKeys = await keys(store);
  const entries = await Promise.all(
    allKeys.map(async (k) => [String(k), await get(k, store)] as const),
  );
  return Object.fromEntries(entries);
}

/**
 * Restaure l'intégralité des données de l'app à partir d'un export
 * précédent (voir exportAllData) : vide le store puis réécrit exactement
 * les clés fournies — un remplacement complet, pas une fusion, pour éviter
 * un état hybride entre l'ancien contenu et la sauvegarde restaurée.
 * L'appelant est responsable de recharger l'app ensuite (tout l'état React
 * déjà en mémoire ailleurs dans l'app resterait sinon périmé).
 */
export async function importAllData(data: Record<string, unknown>): Promise<void> {
  await clear(store);
  await setMany(Object.entries(data), store);
}
