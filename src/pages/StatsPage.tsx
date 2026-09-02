import { useEffect, useMemo, useState } from "react";
import { getCachedSegment, listBudgetPlans, listExpenses, listStops } from "../lib/db";
import {
  buildCumulativeBudgetTrend,
  buildKmByCountry,
  buildMonthlyBudgetTrend,
} from "../lib/statsCalc";
import type { BudgetPlan, Expense, RouteSegment, Stop } from "../lib/types";
import { BudgetTrendChart } from "../components/stats/BudgetTrendChart";
import { CumulativeBudgetChart } from "../components/stats/CumulativeBudgetChart";
import { KmByCountryChart } from "../components/stats/KmByCountryChart";
import "./StatsPage.css";

export function StatsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [exps, plans, loadedStops] = await Promise.all([
        listExpenses(),
        listBudgetPlans(),
        listStops(),
      ]);
      const cached = await Promise.all(
        loadedStops
          .slice(0, -1)
          .map((stop, i) => getCachedSegment(stop.id, loadedStops[i + 1].id)),
      );
      setExpenses(exps);
      setBudgetPlans(plans);
      setStops(loadedStops);
      setSegments(cached.filter((s): s is RouteSegment => Boolean(s)));
      setLoaded(true);
    })();
  }, []);

  const monthly = useMemo(
    () => buildMonthlyBudgetTrend(expenses, budgetPlans),
    [expenses, budgetPlans],
  );
  const cumulative = useMemo(() => buildCumulativeBudgetTrend(monthly), [monthly]);
  const kmByCountry = useMemo(() => buildKmByCountry(stops, segments), [stops, segments]);

  if (!loaded) {
    return <p className="stats-page__loading">Chargement…</p>;
  }

  return (
    <div className="stats-page">
      <h2 className="stats-page__heading">Statistiques</h2>

      <div className="stats-card">
        <h3>Évolution du budget</h3>
        <p className="stats-card__hint">
          Dépenses réelles et prévisionnel, mois par mois depuis le début du voyage.
        </p>
        <BudgetTrendChart points={monthly} />
      </div>

      <div className="stats-card">
        <h3>Prévu vs réel dans la durée</h3>
        <p className="stats-card__hint">
          Cumul depuis le début du voyage, pour voir si le budget global est tenu —
          pas juste un instantané du mois en cours.
        </p>
        <CumulativeBudgetChart points={cumulative} />
      </div>

      <div className="stats-card">
        <h3>Kilomètres par pays</h3>
        <p className="stats-card__hint">
          D'après les étapes marquées visitées dans le module Carte.
        </p>
        <KmByCountryChart data={kmByCountry} />
      </div>
    </div>
  );
}
