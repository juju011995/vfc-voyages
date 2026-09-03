import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import {
  listStops,
  getCachedSegment,
  listExpenses,
  listBudgetPlans,
  getBudgetSettings,
  listTasks,
  listCalendarEvents,
  listLokiDocuments,
  listTreatments,
  listMaterielItems,
  listMaintenanceTypes,
  listMaintenanceLogs,
  getVehicleSettings,
} from "../lib/db";
import type {
  BudgetPlan,
  BudgetSettings,
  CalendarEvent,
  Expense,
  LokiDocument,
  MaintenanceLog,
  MaintenanceType,
  MaterielItem,
  RouteSegment,
  Stop,
  Task,
  Treatment,
} from "../lib/types";
import { countTasks } from "../lib/taskCalc";
import { buildAgenda, getUpcomingAgenda } from "../lib/calendarCalc";
import { getUpcomingLokiDeadlines } from "../lib/lokiCalc";
import { countMaterielItems, spentPriceEUR, totalPriceEUR } from "../lib/materielCalc";
import { buildCumulativeBudgetTrend, buildKmByCountry, buildMonthlyBudgetTrend } from "../lib/statsCalc";
import { buildMaintenanceStatuses, computeCurrentOdometerKm } from "../lib/vehicleCalc";
import { statusColor } from "../components/map/mapColors";
import { useTheme } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import { BudgetSummaryCard } from "../components/budget/BudgetSummaryCard";
import { MaterielSummaryCard } from "../components/budget/MaterielSummaryCard";
import { TaskSummaryCard } from "../components/tasks/TaskSummaryCard";
import { UpcomingEventCard } from "../components/calendar/UpcomingEventCard";
import { LokiSummaryCard } from "../components/loki/LokiSummaryCard";
import { StatsSummaryCard } from "../components/stats/StatsSummaryCard";
import { VehicleSummaryCard } from "../components/vehicle/VehicleSummaryCard";
import "./Dashboard.css";

interface DashboardProps {
  onOpenCarte: () => void;
  onOpenBudget: () => void;
  onOpenTaches: () => void;
  onOpenStats: () => void;
  onOpenPlus: () => void;
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

export function Dashboard({
  onOpenCarte,
  onOpenBudget,
  onOpenTaches,
  onOpenStats,
  onOpenPlus,
}: DashboardProps) {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);
  const [stops, setStops] = useState<Stop[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [lokiDocuments, setLokiDocuments] = useState<LokiDocument[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [materielItems, setMaterielItems] = useState<MaterielItem[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [currentOdometerKm, setCurrentOdometerKm] = useState(0);

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
    (async () => {
      const loadedTasks = await listTasks();
      if (!cancelled) setTasks(loadedTasks);
    })();
    (async () => {
      const loadedEvents = await listCalendarEvents();
      if (!cancelled) setCalendarEvents(loadedEvents);
    })();
    (async () => {
      const [docs, treats] = await Promise.all([listLokiDocuments(), listTreatments()]);
      if (!cancelled) {
        setLokiDocuments(docs);
        setTreatments(treats);
      }
    })();
    (async () => {
      const items = await listMaterielItems();
      if (!cancelled) setMaterielItems(items);
    })();
    (async () => {
      const [types, logs, settings] = await Promise.all([
        listMaintenanceTypes(),
        listMaintenanceLogs(),
        getVehicleSettings(),
      ]);
      const odometer = await computeCurrentOdometerKm(settings);
      if (!cancelled) {
        setMaintenanceTypes(types);
        setMaintenanceLogs(logs);
        setCurrentOdometerKm(odometer);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const taskCounts = countTasks(tasks);
  const nextAgendaItem = getUpcomingAgenda(buildAgenda(calendarEvents, tasks), 1)[0];
  const nextLokiDeadline = getUpcomingLokiDeadlines(lokiDocuments, treatments, 1)[0];

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

  const kmByCountry = buildKmByCountry(stops, segments);
  const visitedKm = kmByCountry.reduce((sum, c) => sum + c.km, 0);
  const monthlyTrend = buildMonthlyBudgetTrend(expenses, budgetPlans);
  const cumulativeTrend = buildCumulativeBudgetTrend(monthlyTrend);
  const lastCumulative = cumulativeTrend[cumulativeTrend.length - 1];
  const cumulativeDeltaEUR =
    budgetPlans.length > 0 && lastCumulative
      ? lastCumulative.cumulativeSpentEUR - lastCumulative.cumulativePrevuEUR
      : undefined;

  const maintenanceStatuses = buildMaintenanceStatuses(
    maintenanceTypes,
    maintenanceLogs,
    currentOdometerKm,
  );
  const mostUrgentMaintenance = maintenanceStatuses.find((s) => s.remainingKm !== undefined);

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

      <button
        type="button"
        className="dashboard__task-card"
        onClick={onOpenTaches}
        aria-label="Ouvrir le module Tâches"
      >
        <TaskSummaryCard counts={taskCounts} />
      </button>

      <button
        type="button"
        className="dashboard__task-card"
        onClick={onOpenPlus}
        aria-label="Ouvrir le calendrier"
      >
        <UpcomingEventCard item={nextAgendaItem} />
      </button>

      <button
        type="button"
        className="dashboard__task-card"
        onClick={onOpenPlus}
        aria-label="Ouvrir le module Loki"
      >
        <LokiSummaryCard deadline={nextLokiDeadline} />
      </button>

      <button
        type="button"
        className="dashboard__task-card"
        onClick={onOpenPlus}
        aria-label="Ouvrir le module Matériel"
      >
        <MaterielSummaryCard
          totalEUR={totalPriceEUR(materielItems)}
          spentEUR={spentPriceEUR(materielItems)}
          counts={countMaterielItems(materielItems)}
          compact
        />
      </button>

      <button
        type="button"
        className="dashboard__task-card"
        onClick={onOpenStats}
        aria-label="Ouvrir les statistiques"
      >
        <StatsSummaryCard
          totalKm={visitedKm}
          countryCount={kmByCountry.length}
          cumulativeDeltaEUR={cumulativeDeltaEUR}
        />
      </button>

      <button
        type="button"
        className="dashboard__task-card"
        onClick={onOpenPlus}
        aria-label="Ouvrir le module Véhicule"
      >
        <VehicleSummaryCard mostUrgent={mostUrgentMaintenance} />
      </button>
    </div>
  );
}
