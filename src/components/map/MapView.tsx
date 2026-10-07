import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import L, { type LatLngBoundsExpression } from "leaflet";
import type { GpxPoint, RouteSegment, SegmentTransport, Stop, TransportMode } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { statusColor, statusLabel } from "./mapColors";
import { SegmentPopupContent } from "./SegmentPopupContent";
import { TRANSPORT_MODE_ICONS } from "./TransportModeToggle";
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

function makeModeIcon(mode: TransportMode, color: string): L.DivIcon {
  const IconComp = TRANSPORT_MODE_ICONS[mode];
  const svg = renderToStaticMarkup(<IconComp />);
  return L.divIcon({
    className: "segment-mode-marker",
    html: `<div class="segment-mode-marker__pin" style="color:${color}">${svg}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
  transportByPair: Map<string, SegmentTransport>;
  gpxPoints?: GpxPoint[];
  showGpxOverlay: boolean;
  editable: boolean;
  selectedStopId?: string;
  palette: Palette;
  onStopClick: (id: string) => void;
  onStopMoved: (id: string, lat: number, lng: number) => void;
  onSetMode: (fromId: string, toId: string, mode: TransportMode) => void;
  onSaveTransportDetails: (
    fromId: string,
    toId: string,
    updates: {
      costAmount?: number;
      costCurrency?: string;
      costAmountEUR?: number;
      durationLabel?: string;
      notes?: string;
    },
  ) => void;
  onRetry: (fromId: string, toId: string) => void;
}

export function MapView({
  stops,
  segments,
  transportByPair,
  gpxPoints,
  showGpxOverlay,
  editable,
  selectedStopId,
  palette,
  onStopClick,
  onStopMoved,
  onSetMode,
  onSaveTransportDetails,
  onRetry,
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
          transport={transportByPair.get(`${seg.fromId}:${seg.toId}`)}
          color={statusColor(palette, status)}
          palette={palette}
          label={statusLabel(status)}
          visited={status === "visite"}
          onSetMode={(mode) => onSetMode(seg.fromId, seg.toId, mode)}
          onSaveDetails={(updates) => onSaveTransportDetails(seg.fromId, seg.toId, updates)}
          onRetry={() => onRetry(seg.fromId, seg.toId)}
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

interface SegmentLineProps {
  segment: RouteSegment;
  transport?: SegmentTransport;
  color: string;
  palette: Palette;
  label: string;
  visited: boolean;
  onSetMode: (mode: TransportMode) => void;
  onSaveDetails: (updates: {
    costAmount?: number;
    costCurrency?: string;
    costAmountEUR?: number;
    durationLabel?: string;
    notes?: string;
  }) => void;
  onRetry: () => void;
}

function SegmentLine({
  segment,
  transport,
  color,
  palette,
  label,
  visited,
  onSetMode,
  onSaveDetails,
  onRetry,
}: SegmentLineProps) {
  const mode = segment.mode ?? "road";
  const placeholder = Boolean(segment.routingFailed || segment.noRouteFound);

  // Tracé "repli" (échec réseau ou aucune route trouvée) : très discret,
  // neutre — jamais confondu avec un vrai tracé routier ou de statut.
  const lineColor = placeholder ? palette.textSecondary : color;
  const weight = placeholder ? 3 : 5;
  const opacity = placeholder ? 0.5 : segment.stale ? 0.6 : 0.9;

  const dashArray = placeholder
    ? "3 5"
    : mode === "ferry"
      ? "10 6"
      : mode === "train"
        ? "6 3 1.5 3"
        : mode === "plane"
          ? "1 5"
          : !visited
            ? "2 10"
            : segment.stale
              ? "2 6"
              : undefined;

  const midpoint = segment.geometry[Math.floor(segment.geometry.length / 2)];

  const popupContent = (
    <SegmentPopupContent
      segment={segment}
      transport={transport}
      statusLabel={label}
      onSetMode={onSetMode}
      onSaveDetails={onSaveDetails}
      onRetry={onRetry}
    />
  );

  return (
    <>
      {mode === "ferry" && !placeholder && (
        <Polyline
          positions={segment.geometry}
          pathOptions={{ color: palette.transportFerry, weight: 9, opacity: 0.45 }}
          interactive={false}
        />
      )}
      <Polyline
        positions={segment.geometry}
        pathOptions={{ color: lineColor, weight, opacity, dashArray }}
      >
        <Popup>{popupContent}</Popup>
      </Polyline>
      {midpoint && (
        <Marker
          position={midpoint}
          icon={makeModeIcon(mode, placeholder ? palette.textSecondary : color)}
        >
          <Popup>{popupContent}</Popup>
        </Marker>
      )}
    </>
  );
}
