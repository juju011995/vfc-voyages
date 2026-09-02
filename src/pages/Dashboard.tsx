import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import {
  listStops,
  getCachedSegment,
  listExpenses,
  listBudgetPlans,
  getBudgetSettings,
} from "../lib/db";
import type { BudgetPlan, BudgetSettings, Expense, RouteSegment, Stop } from "../lib/types";
import { statusColor } from "../components/map/mapColors";
import { useTheme } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import { BudgetSummaryCard } from "../components/budget/BudgetSummaryCard";
import "./Dashboard.css";

interface DashboardProps {
  onOpenCarte: () => void;
  onOpenBudget: () => void;
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function Dashboard({ onOpenCarte, onOpenBudget }: DashboardProps) {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);
  const [stops, setStops] = useState<Stop[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await listStops();
      if (cancelled) return;
      setStops(loaded);
      const cached = await Promise.all(
        loaded.slice(0, -1).map((stop, i) =>
          getCachedSegment(stop.id, loaded[i + 1].id),
        ),
      );
      if (!cancelled) {
        setSegments(cached.filter((s): s is RouteSegment => Boolean(s)));
      }
    })();
    (async () => {
      const [exps, plans, settings] = await Promise.all([
        listExpenses(),
        listBudgetPlans(),
        getBudgetSettings(),
      ]);
      if (!cancelled) {
        setExpenses(exps);
        setBudgetPlans(plans);
        setBudgetSettings(settings);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visited = stops.filter((s) => s.status === "visite").length;
  const totalKm = segments.reduce((sum, s) => sum + s.distanceMeters, 0) / 1000;

  const totalSpentEUR = expenses.reduce((sum, e) => sum + e.amountEUR, 0);
  const thisMonth = currentMonthKey();
  const thisMonthSpentEUR = expenses
    .filter((e) => e.date.startsWith(thisMonth))
    .reduce((sum, e) => sum + e.amountEUR, 0);
  const thisMonthPrevuEUR = budgetPlans
    .filter((p) => p.month === thisMonth)
    .reduce((sum, p) => sum + p.amountEUR, 0);

  return (
    <div className="dashboard">
      <button
        type="button"
        className="dashboard__map-card"
        onClick={onOpenCarte}
        aria-label="Ouvrir le module Carte"
      >
        {stops.length > 0 ? (
          <MapContainer
            center={[stops[0].lat, stops[0].lng]}
            zoom={5}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            attributionControl={false}
            className="dashboard__mini-map"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {segments.map((seg) => (
              <Polyline
                key={`${seg.fromId}-${seg.toId}`}
                positions={seg.geometry}
                pathOptions={{
                  color: statusColor(
                    palette,
                    stops.find((s) => s.id === seg.toId)?.status ?? "a-visiter",
                  ),
                  weight: 4,
                }}
              />
            ))}
            {stops.map((stop) => (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={5}
                pathOptions={{
                  color: statusColor(palette, stop.status),
                  fillColor: statusColor(palette, stop.status),
                  fillOpacity: 1,
                }}
              />
            ))}
          </MapContainer>
        ) : (
          <div className="dashboard__map-empty">
            <span>Aucune étape pour l'instant</span>
            <strong>Ouvrir la carte pour commencer →</strong>
          </div>
        )}
      </button>

      <div className="dashboard__stats">
        <div className="dashboard__stat">
          <span className="dashboard__stat-label">Étapes visitées</span>
          <span className="dashboard__stat-value">
            {visited} / {stops.length}
          </span>
        </div>
        <div className="dashboard__stat">
          <span className="dashboard__stat-label">Km planifiés</span>
          <span className="dashboard__stat-value">
            {totalKm > 0 ? `${Math.round(totalKm)} km` : "—"}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="dashboard__budget-card"
        onClick={onOpenBudget}
        aria-label="Ouvrir le module Budget"
      >
        {budgetSettings && (
          <BudgetSummaryCard
            totalSpentEUR={totalSpentEUR}
            tripTotalBudgetEUR={budgetSettings.tripTotalBudgetEUR}
            monthLabel={monthLabel(thisMonth)}
            monthSpentEUR={thisMonthSpentEUR}
            monthPrevuEUR={thisMonthPrevuEUR}
            compact
          />
        )}
      </button>

      <div className="dashboard__grid">
        <PlaceholderCard title="Tâches" text="Module à venir" />
        <PlaceholderCard title="Loki" text="Module à venir" />
        <PlaceholderCard title="Statistiques" text="Module à venir" />
      </div>
    </div>
  );
}

function PlaceholderCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="dashboard__placeholder-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
