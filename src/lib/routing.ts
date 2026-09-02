// Routing — itinéraire réel, distance et durée via OSRM (serveur démo public).
// Chaque segment (entre deux étapes consécutives) est calculé et mis en cache
// en IndexedDB : si le réseau est indisponible, on retombe sur la dernière
// géométrie connue (marquée `stale`) plutôt que de perdre le tracé.

import { cacheSegment, getCachedSegment } from "./db";
import type { RouteSegment, Stop } from "./types";

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

interface OsrmResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }>;
}

async function fetchSegmentFromOsrm(
  from: Stop,
  to: Stop,
): Promise<RouteSegment> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE_URL}/${coords}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM indisponible (${response.status})`);
  }

  const data: OsrmResponse = await response.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("Aucun itinéraire routier trouvé entre ces deux points.");
  }

  const route = data.routes[0];
  return {
    fromId: from.id,
    toId: to.id,
    // GeoJSON = [lng, lat] ; Leaflet attend [lat, lng].
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

function straightLineFallback(from: Stop, to: Stop): RouteSegment {
  const distanceMeters = haversineMeters(from.lat, from.lng, to.lat, to.lng);
  return {
    fromId: from.id,
    toId: to.id,
    geometry: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distanceMeters,
    // Estimation grossière (60 km/h) tant qu'un vrai tracé n'a pas pu être calculé.
    durationSeconds: (distanceMeters / 1000 / 60) * 3600,
    stale: true,
  };
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

/** Calcule (ou récupère du cache) le segment routé entre deux étapes consécutives. */
export async function getRouteSegment(
  from: Stop,
  to: Stop,
): Promise<RouteSegment> {
  try {
    const segment = await fetchSegmentFromOsrm(from, to);
    await cacheSegment(segment);
    return segment;
  } catch {
    const cached = await getCachedSegment(from.id, to.id);
    if (cached) return { ...cached, stale: true };
    return straightLineFallback(from, to);
  }
}

/** Calcule tous les segments d'un itinéraire ordonné, en parallèle. */
export async function getRouteSegments(
  orderedStops: Stop[],
): Promise<RouteSegment[]> {
  if (orderedStops.length < 2) return [];
  const pairs: Array<[Stop, Stop]> = [];
  for (let i = 0; i < orderedStops.length - 1; i++) {
    pairs.push([orderedStops[i], orderedStops[i + 1]]);
  }
  return Promise.all(pairs.map(([from, to]) => getRouteSegment(from, to)));
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
