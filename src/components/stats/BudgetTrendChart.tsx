import type { MonthlyBudgetPoint } from "../../lib/statsCalc";
import { TrendLineChart } from "./TrendLineChart";

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function BudgetTrendChart({ points }: { points: MonthlyBudgetPoint[] }) {
  return (
    <TrendLineChart
      points={points.map((p) => ({ key: p.month, label: p.label, real: p.spentEUR, planned: p.prevuEUR }))}
      title="Dépenses réelles et prévisionnel, mois par mois"
      realLabel="Réel"
      plannedLabel="Prévisionnel"
      formatValue={formatEUR}
      emptyMessage="Pas encore assez de mois avec des dépenses ou un prévisionnel pour tracer une courbe."
    />
  );
}
