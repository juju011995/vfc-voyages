// Couche de persistance — IndexedDB via idb-keyval.
// Toutes les données du module Carte (étapes, tracé GPX, réglages) vivent ici
// et restent lisibles/modifiables sans connexion réseau (seuls la recherche
// de destination et le calcul d'itinéraire nécessitent le réseau).

import { createStore, get, set, del, keys } from "idb-keyval";
import type { GpxTrack, MapSettings, RouteSegment, Stop } from "./types";

const store = createStore("vfc-voyages", "carte");

const STOPS_PREFIX = "stop:";
const SEGMENT_CACHE_PREFIX = "segment-cache:";
const GPX_TRACK_KEY = "gpx-track";
const MAP_SETTINGS_KEY = "map-settings";

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
