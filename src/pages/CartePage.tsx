import { useEffect, useMemo, useState } from "react";
import {
  deleteStop,
  getGpxTrack,
  getMapSettings,
  listSegmentTransports,
  listStops,
  saveGpxTrack,
  clearGpxTrack as clearGpxTrackDb,
  saveMapSettings,
  saveSegmentTransport,
  saveStop,
  saveStops,
} from "../lib/db";
import { getRouteSegment, getRouteSegments } from "../lib/routing";
import type { GpxTrack, MapMode, RouteSegment, SegmentTransport, Stop, TransportMode } from "../lib/types";
import type { GeocodeResult } from "../lib/geocode";
import { SearchBox } from "../components/map/SearchBox";
import { GpxImport } from "../components/map/GpxImport";
import { MapView } from "../components/map/MapView";
import { MapLegend } from "../components/map/MapLegend";
import { StopList } from "../components/map/StopList";
import { StopEditor } from "../components/map/StopEditor";
import { useTheme } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import "./CartePage.css";

function pairKey(fromId: string, toId: string): string {
  return `${fromId}:${toId}`;
}

function adjacentPairs(orderedStops: Stop[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < orderedStops.length - 1; i++) {
    pairs.push([orderedStops[i].id, orderedStops[i + 1].id]);
  }
  return pairs;
}

export function CartePage() {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);

  const [stops, setStops] = useState<Stop[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [transports, setTransports] = useState<SegmentTransport[]>([]);
  const [gpxTrack, setGpxTrack] = useState<GpxTrack | undefined>();
  const [mode, setMode] = useState<MapMode>("planification");
  const [showGpxOverlay, setShowGpxOverlay] = useState(true);
  const [selectedStopId, setSelectedStopId] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [transportResetNotice, setTransportResetNotice] = useState<string | null>(null);

  // Chargement initial depuis Firestore (cache local hors-ligne) — fonctionne hors-ligne.
  useEffect(() => {
    (async () => {
      const [loadedStops, track, settings, loadedTransports] = await Promise.all([
        listStops(),
        getGpxTrack(),
        getMapSettings(),
        listSegmentTransports(),
      ]);
      setStops(loadedStops);
      setGpxTrack(track);
      setMode(settings.mode);
      setShowGpxOverlay(settings.showGpxOverlay);
      setTransports(loadedTransports);
      setLoaded(true);
    })();
  }, []);

  const transportByPair = useMemo(() => {
    const map = new Map<string, SegmentTransport>();
    for (const t of transports) map.set(pairKey(t.fromId, t.toId), t);
    return map;
  }, [transports]);

  const modeForPair = useMemo(
    () => (fromId: string, toId: string): TransportMode =>
      transportByPair.get(pairKey(fromId, toId))?.mode ?? "road",
    [transportByPair],
  );

  const stopsKey = useMemo(
    () => stops.map((s) => `${s.id}:${s.lat.toFixed(5)}:${s.lng.toFixed(5)}`).join("|"),
    [stops],
  );

  // Recalcule les segments dès que le nombre ou la position des étapes change
  // (un changement de mode seul est géré ponctuellement par handleSetMode,
  // sans redéclencher un recalcul complet des segments routiers voisins).
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    (async () => {
      if (stops.length < 2) {
        setSegments([]);
        return;
      }
      try {
        const result = await getRouteSegments(stops, modeForPair);
        if (!cancelled) {
          setSegments(result);
          setRoutingError(
            result.some((s) => s.stale)
              ? "Certains tracés utilisent la dernière version connue (hors-ligne ou service de routage indisponible)."
              : null,
          );
        }
      } catch {
        if (!cancelled) {
          setRoutingError("Impossible de calculer l'itinéraire pour le moment.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveMapSettings({ mode, showGpxOverlay });
  }, [mode, showGpxOverlay, loaded]);

  async function handlePickPlace(result: GeocodeResult) {
    const newStop: Stop = {
      id: crypto.randomUUID(),
      name: result.displayName.split(",").slice(0, 2).join(","),
      lat: result.lat,
      lng: result.lng,
      country: result.country,
      order: stops.length,
      status: "a-visiter",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveStop(newStop);
    setStops((prev) => [...prev, newStop]);
    setSelectedStopId(newStop.id);
  }

  async function handleReorder(orderedIds: string[]) {
    const byId = new Map(stops.map((s) => [s.id, s]));
    const oldPairs = adjacentPairs(stops);
    const reordered = orderedIds
      .map((id, index) => {
        const stop = byId.get(id);
        return stop ? { ...stop, order: index, updatedAt: Date.now() } : null;
      })
      .filter((s): s is Stop => Boolean(s));
    const newPairKeys = new Set(adjacentPairs(reordered).map(([a, b]) => pairKey(a, b)));

    const lostNonRoadPairs = oldPairs.filter(([a, b]) => {
      const t = transportByPair.get(pairKey(a, b));
      return t && t.mode !== "road" && !newPairKeys.has(pairKey(a, b));
    });
    setTransportResetNotice(
      lostNonRoadPairs.length > 0
        ? `Mode de transport réinitialisé pour : ${lostNonRoadPairs
            .map(([a, b]) => `${byId.get(a)?.name ?? "?"} → ${byId.get(b)?.name ?? "?"}`)
            .join(", ")} (ordre des étapes modifié).`
        : null,
    );

    setStops(reordered);
    await saveStops(reordered);
  }

  async function handleStopMoved(id: string, lat: number, lng: number) {
    setStops((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, lat, lng, updatedAt: Date.now() } : s,
      );
      const moved = next.find((s) => s.id === id);
      if (moved) saveStop(moved);
      return next;
    });
  }

  async function handleSaveStop(updates: Partial<Stop>) {
    if (!selectedStopId) return;
    setStops((prev) => {
      const next = prev.map((s) =>
        s.id === selectedStopId
          ? { ...s, ...updates, updatedAt: Date.now() }
          : s,
      );
      const updated = next.find((s) => s.id === selectedStopId);
      if (updated) saveStop(updated);
      return next;
    });
  }

  async function handleDeleteStop(id: string) {
    await deleteStop(id);
    setStops((prev) => {
      const remaining = prev
        .filter((s) => s.id !== id)
        .sort((a, b) => a.order - b.order)
        .map((s, index) => ({ ...s, order: index }));
      saveStops(remaining);
      return remaining;
    });
    setSelectedStopId((current) => (current === id ? undefined : current));
  }

  async function handleGpxImported(track: GpxTrack) {
    await saveGpxTrack(track);
    setGpxTrack(track);
  }

  async function handleGpxClear() {
    await clearGpxTrackDb();
    setGpxTrack(undefined);
  }

  /** Recalcule un seul segment (changement de mode ou retry) sans toucher aux autres. */
  async function refreshSegment(fromId: string, toId: string, transportMode: TransportMode) {
    const from = stops.find((s) => s.id === fromId);
    const to = stops.find((s) => s.id === toId);
    if (!from || !to) return;
    const newSegment = await getRouteSegment(from, to, transportMode);
    setSegments((prev) => [
      ...prev.filter((s) => !(s.fromId === fromId && s.toId === toId)),
      newSegment,
    ]);
  }

  async function handleSetMode(fromId: string, toId: string, mode: TransportMode) {
    const existing = transportByPair.get(pairKey(fromId, toId));
    const now = Date.now();
    const updated: SegmentTransport = {
      id: pairKey(fromId, toId),
      fromId,
      toId,
      mode,
      costAmount: existing?.costAmount,
      costCurrency: existing?.costCurrency,
      costAmountEUR: existing?.costAmountEUR,
      durationLabel: existing?.durationLabel,
      notes: existing?.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveSegmentTransport(updated);
    setTransports((prev) => [...prev.filter((t) => t.id !== updated.id), updated]);
    await refreshSegment(fromId, toId, mode);
  }

  async function handleSaveTransportDetails(
    fromId: string,
    toId: string,
    updates: {
      costAmount?: number;
      costCurrency?: string;
      costAmountEUR?: number;
      durationLabel?: string;
      notes?: string;
    },
  ) {
    const existing = transportByPair.get(pairKey(fromId, toId));
    const now = Date.now();
    const updated: SegmentTransport = {
      id: pairKey(fromId, toId),
      fromId,
      toId,
      mode: existing?.mode ?? "road",
      ...updates,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveSegmentTransport(updated);
    setTransports((prev) => [...prev.filter((t) => t.id !== updated.id), updated]);
  }

  async function handleRetry(fromId: string, toId: string) {
    await refreshSegment(fromId, toId, modeForPair(fromId, toId));
  }

  const selectedStop = stops.find((s) => s.id === selectedStopId);
  const selectedStopIndex = stops.findIndex((s) => s.id === selectedStopId);
  const previousStop = selectedStopIndex > 0 ? stops[selectedStopIndex - 1] : undefined;

  return (
    <div className="carte-page">
      <div className="carte-page__toolbar">
        <SearchBox onPick={handlePickPlace} />
        <div className="carte-page__mode-toggle" role="tablist" aria-label="Mode de la carte">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "planification"}
            className={mode === "planification" ? "is-active" : ""}
            onClick={() => setMode("planification")}
          >
            Planification
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "trace-reel"}
            className={mode === "trace-reel" ? "is-active" : ""}
            onClick={() => setMode("trace-reel")}
          >
            Tracé réel (GPX)
          </button>
        </div>
      </div>

      {mode === "trace-reel" && (
        <div className="carte-page__gpx-bar">
          <GpxImport
            currentTrack={gpxTrack}
            onImported={handleGpxImported}
            onClear={handleGpxClear}
          />
          {gpxTrack && (
            <label className="carte-page__gpx-toggle">
              <input
                type="checkbox"
                checked={showGpxOverlay}
                onChange={(e) => setShowGpxOverlay(e.target.checked)}
              />
              Afficher la superposition
            </label>
          )}
        </div>
      )}

      {routingError && <p className="carte-page__notice">{routingError}</p>}
      {transportResetNotice && <p className="carte-page__notice">{transportResetNotice}</p>}

      <div className="carte-page__body">
        <aside className="carte-page__sidebar">
          <StopList
            stops={stops}
            selectedStopId={selectedStopId}
            palette={palette}
            onSelect={(id) => setSelectedStopId(id)}
            onReorder={handleReorder}
            onDelete={handleDeleteStop}
          />
        </aside>

        <div className="carte-page__map">
          <MapView
            stops={stops}
            segments={segments}
            transportByPair={transportByPair}
            gpxPoints={gpxTrack?.points}
            showGpxOverlay={mode === "trace-reel" && showGpxOverlay}
            editable={mode === "planification"}
            selectedStopId={selectedStopId}
            palette={palette}
            onStopClick={(id) => setSelectedStopId(id)}
            onStopMoved={handleStopMoved}
            onSetMode={handleSetMode}
            onSaveTransportDetails={handleSaveTransportDetails}
            onRetry={handleRetry}
          />
          <MapLegend palette={palette} />
        </div>

        {selectedStop && (
          <div className="carte-page__editor">
            <StopEditor
              stop={selectedStop}
              previousStop={previousStop}
              transport={
                previousStop
                  ? transportByPair.get(pairKey(previousStop.id, selectedStop.id))
                  : undefined
              }
              onSetMode={(transportMode) => {
                if (previousStop) handleSetMode(previousStop.id, selectedStop.id, transportMode);
              }}
              onClose={() => setSelectedStopId(undefined)}
              onSave={handleSaveStop}
              onDelete={handleDeleteStop}
            />
          </div>
        )}
      </div>
    </div>
  );
}
