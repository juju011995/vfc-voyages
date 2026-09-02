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
