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
