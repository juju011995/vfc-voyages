// Routing — itinéraire réel, distance et durée via OSRM (serveur démo public)
// pour le mode "road", géométrie directe (ligne ou arc) pour ferry/train/plane.
//
// Chaque segment routier calculé est mis en cache à deux niveaux :
// - route-geometry (coordonnées + mode) : résultat brut OSRM, pour éviter de
//   rappeler le serveur si les coordonnées n'ont pas changé ;
// - segment-cache (paire d'étapes) : l'état affiché pour cette liaison de
//   l'itinéraire — ce que lisent la Carte, le Budget et les Statistiques.
// Si le réseau est indisponible, on retombe sur la dernière géométrie
// routière connue (marquée `stale`) ; si aucune n'est connue, une ligne
// droite très temporaire est affichée (marquée `routingFailed`) mais jamais
// mise en cache, pour ne jamais faire passer un repli pour un vrai tracé.

import {
  cacheRouteGeometry,
  cacheSegment,
  getCachedRouteGeometry,
  getCachedSegment,
} from "./db";
import type { RouteSegment, Stop, TransportMode } from "./types";

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
const RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [800, 1600];
const MAX_CONCURRENT_REQUESTS = 2;

interface OsrmGeometryResult {
  geometry: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

type OsrmFailure =
  | { kind: "no-route" } // OSRM a répondu, mais aucun itinéraire routier n'existe (ex. traversée maritime)
  | { kind: "network" } // requête impossible/échouée — potentiellement transitoire
  | { kind: "processing" }; // réponse reçue (HTTP 200) mais impossible à interpréter — pas un souci réseau

interface OsrmResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSegmentFromOsrmOnce(
  from: Stop,
  to: Stop,
): Promise<OsrmGeometryResult> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE_URL}/${coords}?overview=full&geometries=geojson`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error(`[routing] requête OSRM impossible (${from.name} → ${to.name})`, err);
    throw { kind: "network" } satisfies OsrmFailure;
  }
  if (!response.ok) {
    console.error(
      `[routing] OSRM a répondu avec le statut ${response.status} (${from.name} → ${to.name})`,
    );
    throw { kind: "network" } satisfies OsrmFailure;
  }

  let data: OsrmResponse;
  try {
    data = await response.json();
  } catch (err) {
    console.error(
      `[routing] réponse OSRM illisible (JSON invalide) pour ${from.name} → ${to.name}`,
      err,
    );
    throw { kind: "processing" } satisfies OsrmFailure;
  }

  if (data.code !== "Ok" || !data.routes?.length) {
    // Réponse valide du serveur : ce n'est pas un souci réseau, juste aucun
    // itinéraire routier possible entre ces deux points.
    throw { kind: "no-route" } satisfies OsrmFailure;
  }

  const route = data.routes[0];
  const coordinates = route.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    console.error(
      `[routing] réponse OSRM "Ok" mais sans géométrie exploitable pour ${from.name} → ${to.name}`,
      route,
    );
    throw { kind: "processing" } satisfies OsrmFailure;
  }

  return {
    // GeoJSON = [lng, lat] ; Leaflet attend [lat, lng].
    geometry: coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

/** Jusqu'à 3 tentatives espacées — seulement pour un échec réseau/transitoire, jamais pour "aucune route trouvée" ni une réponse inexploitable (réessayer ne changerait rien). */
async function fetchSegmentFromOsrmWithRetry(
  from: Stop,
  to: Stop,
): Promise<OsrmGeometryResult> {
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchSegmentFromOsrmOnce(from, to);
    } catch (err) {
      const failure = err as OsrmFailure;
      if (failure.kind !== "network") throw failure;
      const isLastAttempt = attempt === RETRY_ATTEMPTS - 1;
      if (isLastAttempt) throw failure;
      await sleep(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1)!);
    }
  }
  // Inatteignable (la boucle retourne ou lève à chaque itération), mais TS a besoin d'un retour.
  throw { kind: "network" } satisfies OsrmFailure;
}

// Évite de relancer un appel déjà en cours pour la même paire de coordonnées
// + mode (ex. plusieurs clics sur "Réessayer", ou popup + marqueur de mode
// montés en même temps) : les appelants simultanés partagent la même requête
// au lieu d'en déclencher une nouvelle chacun.
const inFlightOsrmRequests = new Map<string, Promise<OsrmGeometryResult>>();

function fetchSegmentFromOsrmDeduped(
  dedupeKey: string,
  from: Stop,
  to: Stop,
): Promise<OsrmGeometryResult> {
  const existing = inFlightOsrmRequests.get(dedupeKey);
  if (existing) return existing;

  const request = fetchSegmentFromOsrmWithRetry(from, to).finally(() => {
    inFlightOsrmRequests.delete(dedupeKey);
  });
  inFlightOsrmRequests.set(dedupeKey, request);
  return request;
}

function roundCoord(n: number): string {
  return n.toFixed(5);
}

function routeGeometryCacheKey(mode: TransportMode, from: Stop, to: Stop): string {
  return `${mode}:${roundCoord(from.lat)},${roundCoord(from.lng)}:${roundCoord(to.lat)},${roundCoord(to.lng)}`;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function straightLineGeometry(from: Stop, to: Stop): [number, number][] {
  return [
    [from.lat, from.lng],
    [to.lat, to.lng],
  ];
}

/** Arc simple (courbe quadratique) entre deux points, pour représenter un trajet en avion sans suivre aucune route. */
function arcGeometry(from: Stop, to: Stop): [number, number][] {
  const steps = 32;
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  // Décalage perpendiculaire au segment, proportionnel à sa longueur, pour
  // dessiner une courbe visible plutôt qu'une ligne droite.
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  const offsetFactor = 0.12;
  const curveLat = midLat + -dLng * offsetFactor;
  const curveLng = midLng + dLat * offsetFactor;

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat =
      (1 - t) ** 2 * from.lat + 2 * (1 - t) * t * curveLat + t ** 2 * to.lat;
    const lng =
      (1 - t) ** 2 * from.lng + 2 * (1 - t) * t * curveLng + t ** 2 * to.lng;
    points.push([lat, lng]);
  }
  return points;
}

function straightLineFallback(
  from: Stop,
  to: Stop,
  failureReason: "network" | "processing",
): RouteSegment {
  const distanceMeters = haversineMeters(from.lat, from.lng, to.lat, to.lng);
  return {
    fromId: from.id,
    toId: to.id,
    mode: "road",
    geometry: straightLineGeometry(from, to),
    distanceMeters,
    // Estimation grossière (60 km/h) tant qu'un vrai tracé n'a pas pu être calculé.
    durationSeconds: (distanceMeters / 1000 / 60) * 3600,
    routingFailed: true,
    failureReason,
  };
}

/** Écrit dans le cache sans jamais faire échouer l'appelant : le tracé obtenu doit s'afficher même si sa mise en cache échoue (ex. document Firestore invalide) — seule une trace console permet alors de diagnostiquer. */
async function cacheBestEffort(label: string, write: () => Promise<void>): Promise<void> {
  try {
    await write();
  } catch (err) {
    console.error(`[routing] échec de mise en cache (${label}) — le tracé reste affiché normalement`, err);
  }
}

/** Calcule (ou récupère du cache) le segment pour une liaison entre deux étapes consécutives, selon le mode choisi. */
export async function getRouteSegment(
  from: Stop,
  to: Stop,
  mode: TransportMode = "road",
): Promise<RouteSegment> {
  if (mode !== "road") {
    const distanceMeters = haversineMeters(from.lat, from.lng, to.lat, to.lng);
    const geometry = mode === "plane" ? arcGeometry(from, to) : straightLineGeometry(from, to);
    const segment: RouteSegment = {
      fromId: from.id,
      toId: to.id,
      mode,
      geometry,
      distanceMeters,
    };
    await cacheBestEffort(`segment ${mode} ${from.name} → ${to.name}`, () => cacheSegment(segment));
    return segment;
  }

  const geometryCacheKey = routeGeometryCacheKey(mode, from, to);
  const cachedGeometry = await getCachedRouteGeometry(geometryCacheKey);
  if (cachedGeometry) {
    const segment: RouteSegment = { fromId: from.id, toId: to.id, mode, ...cachedGeometry };
    await cacheBestEffort(`segment ${from.name} → ${to.name}`, () => cacheSegment(segment));
    return segment;
  }

  let result: OsrmGeometryResult;
  try {
    result = await fetchSegmentFromOsrmDeduped(geometryCacheKey, from, to);
  } catch (err) {
    const failure = err as OsrmFailure;
    console.error(`[routing] échec du calcul d'itinéraire (${from.name} → ${to.name})`, failure);
    if (failure.kind === "no-route") {
      const distanceMeters = haversineMeters(from.lat, from.lng, to.lat, to.lng);
      return {
        fromId: from.id,
        toId: to.id,
        mode,
        geometry: straightLineGeometry(from, to),
        distanceMeters,
        noRouteFound: true,
      };
    }
    const cachedSegment = await getCachedSegment(from.id, to.id);
    if (cachedSegment) return { ...cachedSegment, mode, stale: true };
    return straightLineFallback(from, to, failure.kind === "processing" ? "processing" : "network");
  }

  // OSRM a répondu avec un vrai tracé : on le retourne tout de suite — la
  // mise en cache ne doit jamais empêcher l'affichage du tracé obtenu.
  const segment: RouteSegment = { fromId: from.id, toId: to.id, mode, ...result };
  await cacheBestEffort(`géométrie ${from.name} → ${to.name}`, () =>
    cacheRouteGeometry(geometryCacheKey, result),
  );
  await cacheBestEffort(`segment ${from.name} → ${to.name}`, () => cacheSegment(segment));
  return segment;
}

/** Exécute `fn` sur chaque élément avec au plus `limit` appels simultanés, en conservant l'ordre des résultats. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Calcule tous les segments d'un itinéraire ordonné — par file (2 requêtes OSRM max en parallèle) pour ne pas saturer le serveur démo. */
export async function getRouteSegments(
  orderedStops: Stop[],
  modeForPair: (fromId: string, toId: string) => TransportMode,
): Promise<RouteSegment[]> {
  if (orderedStops.length < 2) return [];
  const pairs: Array<[Stop, Stop]> = [];
  for (let i = 0; i < orderedStops.length - 1; i++) {
    pairs.push([orderedStops[i], orderedStops[i + 1]]);
  }
  return mapWithConcurrency(pairs, MAX_CONCURRENT_REQUESTS, ([from, to]) =>
    getRouteSegment(from, to, modeForPair(from.id, to.id)),
  );
}

export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes.toString().padStart(2, "0")}`;
}
