import type { CumulativeBudgetPoint } from "../../lib/statsCalc";
import { TrendLineChart } from "./TrendLineChart";

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function CumulativeBudgetChart({ points }: { points: CumulativeBudgetPoint[] }) {
  return (
    <TrendLineChart
      points={points.map((p) => ({
        key: p.month,
        label: p.label,
        real: p.cumulativeSpentEUR,
        planned: p.cumulativePrevuEUR,
      }))}
      title="Cumul des dépenses réelles vs prévisionnel depuis le début du voyage"
      realLabel="Cumul réel"
      plannedLabel="Cumul prévisionnel"
      formatValue={formatEUR}
      showArea
      emptyMessage="Pas encore assez de mois avec des dépenses ou un prévisionnel pour ce cumul."
    />
  );
}
