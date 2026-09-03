import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L, { type LatLngBoundsExpression, type LeafletMouseEvent } from "leaflet";
import type { GpxPoint, RouteSegment, Stop } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { statusColor, statusLabel } from "./mapColors";
import { formatDistance, formatDuration } from "../../lib/routing";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

const DEFAULT_CENTER: [number, number] = [46.5, 4]; // France, point de départ neutre
const DEFAULT_ZOOM = 5;

function makeStopIcon(
  palette: Palette,
  status: Stop["status"],
  order: number,
  selected: boolean,
): L.DivIcon {
  const color = statusColor(palette, status);
  const size = selected ? 34 : 28;
  return L.divIcon({
    className: "stop-marker",
    html: `
      <div class="stop-marker__pin" style="
        width:${size}px;height:${size}px;
        background:${color};
        border-color:${selected ? palette.action : palette.surface};
      ">
        <span>${order}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ stops }: { stops: Stop[] }) {
  const map = useMap();
  const stopsKey = stops.map((s) => `${s.lat},${s.lng}`).join("|");

  useEffect(() => {
    if (stops.length === 0) return;
    if (stops.length === 1) {
      map.setView([stops[0].lat, stops[0].lng], 9);
      return;
    }
    const bounds: LatLngBoundsExpression = stops.map((s) => [s.lat, s.lng]);
    map.fitBounds(bounds, { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey]);

  return null;
}

interface MapViewProps {
  stops: Stop[];
  segments: RouteSegment[];
  gpxPoints?: GpxPoint[];
  showGpxOverlay: boolean;
  editable: boolean;
  selectedStopId?: string;
  palette: Palette;
  onStopClick: (id: string) => void;
  onStopMoved: (id: string, lat: number, lng: number) => void;
}

export function MapView({
  stops,
  segments,
  gpxPoints,
  showGpxOverlay,
  editable,
  selectedStopId,
  palette,
  onStopClick,
  onStopMoved,
}: MapViewProps) {
  const segmentsWithStatus = useMemo(
    () =>
      segments.map((seg) => {
        const toStop = stops.find((s) => s.id === seg.toId);
        return { seg, status: toStop?.status ?? ("a-visiter" as const) };
      }),
    [segments, stops],
  );

  const gpxPositions = useMemo<[number, number][] | undefined>(
    () => gpxPoints?.map((p) => [p.lat, p.lng] as [number, number]),
    [gpxPoints],
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="map-view"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {showGpxOverlay && gpxPositions && gpxPositions.length > 1 && (
        <Polyline
          positions={gpxPositions}
          pathOptions={{
            color: palette.terracottaDecorative,
            weight: 3,
            dashArray: "1 8",
            lineCap: "round",
          }}
        />
      )}

      {segmentsWithStatus.map(({ seg, status }) => (
        <SegmentLine
          key={`${seg.fromId}-${seg.toId}`}
          segment={seg}
          color={statusColor(palette, status)}
          label={statusLabel(status)}
          visited={status === "visite"}
        />
      ))}

      {stops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={makeStopIcon(
            palette,
            stop.status,
            stop.order + 1,
            stop.id === selectedStopId,
          )}
          draggable={editable}
          eventHandlers={{
            click: () => onStopClick(stop.id),
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const { lat, lng } = marker.getLatLng();
              onStopMoved(stop.id, lat, lng);
            },
          }}
        />
      ))}

      <FitBounds stops={stops} />
    </MapContainer>
  );
}

function SegmentLine({
  segment,
  color,
  label,
  visited,
}: {
  segment: RouteSegment;
  color: string;
  label: string;
  visited: boolean;
}) {
  const lineRef = useRef<L.Polyline | null>(null);

  const handleClick = (e: LeafletMouseEvent) => {
    const layer = lineRef.current;
    if (!layer) return;
    const html = `
      <div class="segment-popup">
        <strong>${label}${segment.stale ? " · hors-ligne" : ""}</strong>
        <div>${formatDistance(segment.distanceMeters)} · ${formatDuration(
          segment.durationSeconds,
        )}</div>
      </div>
    `;
    layer.bindPopup(html).openPopup(e.latlng);
  };

  return (
    <Polyline
      ref={lineRef}
      positions={segment.geometry}
      pathOptions={{
        color,
        weight: 5,
        opacity: segment.stale ? 0.6 : 0.9,
        // Pointillés tant que l'étape d'arrivée n'est pas visitée — même
        // logique de trait "en attente" que segment.stale, juste un dash
        // plus large pour rester lisible à l'échelle d'un itinéraire entier.
        dashArray: !visited ? "2 10" : segment.stale ? "2 6" : undefined,
      }}
      eventHandlers={{ click: handleClick }}
    />
  );
}
