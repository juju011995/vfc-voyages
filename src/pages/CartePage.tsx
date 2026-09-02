import { useEffect, useMemo, useState } from "react";
import {
  deleteStop,
  getGpxTrack,
  getMapSettings,
  listStops,
  saveGpxTrack,
  clearGpxTrack as clearGpxTrackDb,
  saveMapSettings,
  saveStop,
  saveStops,
} from "../lib/db";
import { getRouteSegments } from "../lib/routing";
import type { GpxTrack, MapMode, RouteSegment, Stop } from "../lib/types";
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

export function CartePage() {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);

  const [stops, setStops] = useState<Stop[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [gpxTrack, setGpxTrack] = useState<GpxTrack | undefined>();
  const [mode, setMode] = useState<MapMode>("planification");
  const [showGpxOverlay, setShowGpxOverlay] = useState(true);
  const [selectedStopId, setSelectedStopId] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Chargement initial depuis IndexedDB — fonctionne hors-ligne.
  useEffect(() => {
    (async () => {
      const [loadedStops, track, settings] = await Promise.all([
        listStops(),
        getGpxTrack(),
        getMapSettings(),
      ]);
      setStops(loadedStops);
      setGpxTrack(track);
      setMode(settings.mode);
      setShowGpxOverlay(settings.showGpxOverlay);
      setLoaded(true);
    })();
  }, []);

  const stopsKey = useMemo(
    () => stops.map((s) => `${s.id}:${s.lat.toFixed(5)}:${s.lng.toFixed(5)}`).join("|"),
    [stops],
  );

  // Recalcule les segments routés dès que le nombre ou la position des étapes change.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    (async () => {
      if (stops.length < 2) {
        setSegments([]);
        return;
      }
      try {
        const result = await getRouteSegments(stops);
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
    const reordered = orderedIds
      .map((id, index) => {
        const stop = byId.get(id);
        return stop ? { ...stop, order: index, updatedAt: Date.now() } : null;
      })
      .filter((s): s is Stop => Boolean(s));
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

  const selectedStop = stops.find((s) => s.id === selectedStopId);

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
            gpxPoints={gpxTrack?.points}
            showGpxOverlay={mode === "trace-reel" && showGpxOverlay}
            editable={mode === "planification"}
            selectedStopId={selectedStopId}
            palette={palette}
            onStopClick={(id) => setSelectedStopId(id)}
            onStopMoved={handleStopMoved}
          />
          <MapLegend palette={palette} />
        </div>

        {selectedStop && (
          <div className="carte-page__editor">
            <StopEditor
              stop={selectedStop}
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
