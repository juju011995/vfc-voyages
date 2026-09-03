import { useState } from "react";
import type { WeightEntry } from "../../lib/types";
import { getWeightTrend } from "../../lib/lokiCalc";
import "./WeightChart.css";

interface WeightChartProps {
  entries: WeightEntry[];
  onAdd: (date: string, weightKg: number) => void;
  onDelete: (id: string) => void;
}

const WIDTH = 300;
const HEIGHT = 90;
const PADDING = 10;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function buildPoints(entries: WeightEntry[]): [number, number][] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const dates = sorted.map((e) => new Date(`${e.date}T00:00:00`).getTime());
  const weights = sorted.map((e) => e.weightKg);
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const dRange = maxDate - minDate || 1;
  const wRange = maxW - minW || 1;

  return sorted.map((_, i) => {
    const x = PADDING + ((dates[i] - minDate) / dRange) * (WIDTH - 2 * PADDING);
    const y = HEIGHT - PADDING - ((weights[i] - minW) / wRange) * (HEIGHT - 2 * PADDING);
    return [x, y];
  });
}

export function WeightChart({ entries, onAdd, onDelete }: WeightChartProps) {
  const [date, setDate] = useState(todayIso());
  const [weight, setWeight] = useState("");

  const trend = getWeightTrend(entries);
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  function handleAdd() {
    const parsed = parseFloat(weight.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onAdd(date, parsed);
    setWeight("");
  }

  return (
    <div className="weight-chart">
      {trend && (
        <div className="weight-chart__current">
          <span className="weight-chart__value">{trend.latestKg} kg</span>
          {trend.deltaKg !== undefined && (
            <span className="weight-chart__delta">
              {trend.deltaKg > 0 ? "+" : ""}
              {trend.deltaKg} kg depuis la mesure précédente
            </span>
          )}
          <span className="weight-chart__date">au {formatDate(trend.latestDate)}</span>
        </div>
      )}

      {entries.length >= 2 && (
        <svg
          className="weight-chart__svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Évolution du poids"
        >
          <polyline
            points={buildPoints(entries)
              .map(([x, y]) => `${x},${y}`)
              .join(" ")}
            fill="none"
            stroke="var(--color-action)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {buildPoints(entries).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="var(--color-action)" />
          ))}
        </svg>
      )}

      <div className="weight-chart__add">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          type="text"
          inputMode="decimal"
          placeholder="Poids (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button type="button" className="btn btn--secondary" onClick={handleAdd}>
          Ajouter
        </button>
      </div>

      {sorted.length > 0 && (
        <ul className="weight-chart__history">
          {sorted.map((entry) => (
            <li key={entry.id}>
              <span>{formatDate(entry.date)}</span>
              <span>{entry.weightKg} kg</span>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                aria-label={`Supprimer la mesure du ${formatDate(entry.date)}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
