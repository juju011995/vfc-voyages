// Modèle de données du module Carte.
// Persisté en IndexedDB (voir src/lib/db.ts) pour un accès et une édition
// intégralement hors-ligne, conformément au cahier des charges.

export type Profile = "justine" | "nathan";

export type StopStatus = "a-visiter" | "visite";

export interface Stop {
  id: string;
  /** Nom affiché (ville/lieu), tel que choisi lors de la recherche. */
  name: string;
  lat: number;
  lng: number;
  /** Pays (nom lisible), extrait des données structurées de Nominatim lors de la recherche — utilisé par le module Loki. */
  country?: string;
  /** Position dans l'itinéraire — source de vérité pour l'ordre des étapes. */
  order: number;
  status: StopStatus;
  /** Date prévue de l'étape, format ISO (YYYY-MM-DD), optionnelle. */
  datePrevue?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/** Géométrie + métriques d'un segment routé entre deux étapes consécutives. */
export interface RouteSegment {
  /** id de l'étape de départ */
  fromId: string;
  /** id de l'étape d'arrivée — son statut détermine la couleur du segment */
  toId: string;
  /** [lat, lng][] suivant les routes réelles (issu d'OSRM) */
  geometry: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  /** true si la géométrie vient du cache local (calculée hors-ligne indisponible) */
  stale?: boolean;
}

export interface GpxPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: string;
}

export interface GpxTrack {
  id: string;
  fileName: string;
  points: GpxPoint[];
  importedAt: number;
}

export type MapMode = "planification" | "trace-reel";

export interface MapSettings {
  mode: MapMode;
  /** Visibilité du tracé GPX importé lorsqu'on est en mode planification. */
  showGpxOverlay: boolean;
}

// ---------------------------------------------------------------------------
// Module Budget

/** Qui a payé une dépense — "both" = compte commun, juste pour la trace. */
export type Payer = Profile | "both";

export interface Category {
  id: string;
  name: string;
  /** Catégories fournies par défaut — non supprimables, seulement renommables. */
  isDefault: boolean;
  archived?: boolean;
  createdAt: number;
}

/** Prévisionnel d'une catégorie pour un mois donné (toujours en euros). */
export interface BudgetPlan {
  id: string;
  /** "YYYY-MM" */
  month: string;
  categoryId: string;
  amountEUR: number;
  updatedAt: number;
}

export interface Expense {
  id: string;
  /** Montant saisi dans la devise d'origine. */
  amount: number;
  /** Code ISO 4217, ex. "EUR", "NOK". */
  currency: string;
  /** Montant converti en euros au moment de la saisie (voir src/lib/currency.ts). */
  amountEUR: number;
  categoryId: string;
  /** Date de la dépense, format ISO (YYYY-MM-DD). */
  date: string;
  note?: string;
  payer: Payer;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetSettings {
  /** Prix du carburant, en euros par litre — modifiable manuellement (varie par pays). */
  fuelPricePerLiter: number;
  /** Consommation du véhicule en L/100km. */
  vehicleConsumptionL100km: number;
  /** Budget total prévu pour l'ensemble du voyage, en euros (optionnel). */
  tripTotalBudgetEUR?: number;
}

/** Taux de change vers l'EUR, mis en cache pour un usage hors-ligne. */
export interface ExchangeRates {
  base: "EUR";
  /** ex. { NOK: 11.7, GBP: 0.85, ... } — combien d'unités de la devise pour 1 EUR. */
  rates: Record<string, number>;
  fetchedAt: number;
}

// ---------------------------------------------------------------------------
// Module Tâches
//
// Liaisons croisées avec les autres modules, sans dupliquer la donnée :
// - Loki : lira les tâches via getTasksByTagName(tasks, tags, "Loki")
//   (src/lib/taskCalc.ts), donnée unique affichée à deux endroits.
// - Matériel : Task.linkedMaterielItemId lie une tâche à un item du module
//   Matériel ; leurs statuts sont synchronisés dans les deux sens par
//   saveTask/saveMaterielItem (src/lib/db.ts).
// - Calendrier : lira les échéances via listUpcomingDeadlines(tasks)
//   (src/lib/taskCalc.ts) plutôt que de dupliquer la saisie.

export type TaskStatus = "a-faire" | "en-cours" | "fait";

export type TaskPriority = "urgent" | "normal" | "pas-presse";

export interface TaskTag {
  id: string;
  name: string;
  /** Tags fournis par défaut — non supprimables, seulement renommables. */
  isDefault: boolean;
  archived?: boolean;
  /** Couleur pastel (hex) — identifie le tag partout où il s'affiche (cartes Tâches, Calendrier). */
  color?: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  tagId: string;
  assignee: Payer;
  /** Date d'échéance, format ISO (YYYY-MM-DD), optionnelle. */
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** Lien vers un item du module Matériel — voir le commentaire ci-dessus. */
  linkedMaterielItemId?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Module Calendrier
//
// Les échéances de tâches ne sont PAS dupliquées ici : le calendrier les lit
// à la volée depuis le module Tâches (voir buildAgenda() dans
// src/lib/calendarCalc.ts). Seuls les événements indépendants (rendez-vous,
// réservations, visites) sont persistés comme CalendarEvent.
//
// Synchronisation Google Agenda : hors périmètre (nécessite OAuth + réseau,
// contradictoire avec le mode hors-ligne obligatoire), mais `source` et
// `externalId` sont réservés dès maintenant pour qu'un futur import/export
// puisse distinguer un événement créé localement d'un événement importé,
// sans avoir à changer la forme des données existantes.

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  /** Date de début, format ISO (YYYY-MM-DD). */
  date: string;
  /** Date de fin optionnelle, pour un événement sur plusieurs jours (ex. réservation d'hôtel). */
  endDate?: string;
  /** Heure optionnelle, format HH:MM. */
  time?: string;
  /** Réservé pour une future synchronisation Google Agenda — toujours "local" pour l'instant. */
  source?: "local" | "google";
  externalId?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Module Loki
//
// Les tâches taguées "Loki" ne sont pas dupliquées ici non plus : ce module
// les lit via getTasksByTagName(tasks, tags, "Loki") (src/lib/taskCalc.ts),
// exactement comme prévu par le commentaire du module Tâches.

export type LokiDocumentType = "vaccin" | "document";

export interface LokiDocument {
  id: string;
  title: string;
  type: LokiDocumentType;
  /** Date d'obtention ou de dernière administration, ISO (YYYY-MM-DD). */
  date?: string;
  /** Date d'échéance/rappel, ISO. */
  dueDate?: string;
  notes?: string;
  /** Lien vers le document scanné, stocké sur un Google Drive externe — pas de photo dans l'outil. */
  driveLink?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  createdAt: number;
}

export type TreatmentType = "antiparasitaire" | "vermifuge" | "autre";

export interface Treatment {
  id: string;
  type: TreatmentType;
  product?: string;
  date: string;
  nextDueDate?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VetContact {
  id: string;
  country: string;
  city?: string;
  name?: string;
  address?: string;
  phone?: string;
  notes?: string;
  /** true pour les entrées de la présélection initiale — non supprimables, seulement complétables. */
  prefilled?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BorderChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface BorderRequirement {
  /** Utilise le nom du pays comme identifiant — une seule fiche par pays. */
  id: string;
  country: string;
  items: BorderChecklistItem[];
  notes?: string;
  updatedAt: number;
}

/**
 * Pays affichés dans les onglets Vétérinaires/Frontières, en plus de ceux
 * détectés automatiquement depuis les étapes du module Carte (Stop.country).
 * Un pays retiré manuellement reste retiré même s'il est toujours présent
 * sur l'itinéraire ; un pays ajouté manuellement reste affiché même sans
 * étape (ou si ses étapes sont supprimées). Ne supprime jamais les données
 * (VetContact, BorderRequirement) déjà saisies pour un pays — seulement sa
 * présence dans la liste affichée.
 */
export interface LokiCountrySettings {
  manuallyAdded: string[];
  manuallyRemoved: string[];
}

// ---------------------------------------------------------------------------
// Module Matériel
//
// Le lien avec une tâche est porté uniquement par Task.linkedMaterielItemId
// (voir le commentaire "Module Tâches" plus haut) — pas de champ retour sur
// MaterielItem, pour éviter d'avoir deux sources de vérité à resynchroniser.
// Le statut de l'item et celui de la tâche liée sont maintenus alignés dans
// les deux sens par la couche de stockage (voir saveTask/saveMaterielItem
// dans src/lib/db.ts), quel que soit le côté modifié.

export type MaterielItemStatus = "a-acheter" | "en-cours" | "achete";

export interface MaterielCategory {
  id: string;
  name: string;
  /** Catégories fournies par défaut — non supprimables, seulement renommables. */
  isDefault: boolean;
  archived?: boolean;
  /** Couleur pastel (hex) — même système que les tags de tâches. */
  color?: string;
  createdAt: number;
}

export interface MaterielItem {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  status: MaterielItemStatus;
  /** Prix total de la ligne (pas un prix unitaire), en euros — optionnel tant que non acheté. */
  priceEUR?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Module Paramètres
//
// Volontairement distinct de BudgetSettings (prix carburant, consommation) :
// ces deux réglages restent uniquement dans le module Budget pour éviter
// tout doublon. Les couleurs Justine=prune/Nathan=bleu ardoise (palette.ts)
// ne sont pas concernées par ProfileNames — seul le libellé affiché change,
// "justine"/"nathan" restent les identifiants stables utilisés partout
// ailleurs (Payer, assignee, etc.).

export interface ProfileNames {
  justine: string;
  nathan: string;
}

export interface AppSettings {
  /** Devise présélectionnée pour une nouvelle dépense (module Budget) — les montants restent agrégés en euros. */
  defaultCurrency: string;
  profileNames: ProfileNames;
}
