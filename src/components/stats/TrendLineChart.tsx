import { useId, useState } from "react";
import "./TrendLineChart.css";

export interface TrendLineChartPoint {
  key: string;
  label: string;
  real: number;
  planned: number;
}

interface TrendLineChartProps {
  points: TrendLineChartPoint[];
  /** Titre accessible du graphique (balise <title> SVG). */
  title: string;
  realLabel: string;
  plannedLabel: string;
  formatValue: (n: number) => string;
  /** Remplissage léger (~10% d'opacité) sous la courbe "réel" — pour les vues cumulées. */
  showArea?: boolean;
  emptyMessage: string;
}

const WIDTH = 340;
const HEIGHT = 190;
const PAD_LEFT = 42;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

/** Arrondit vers le haut à une valeur "ronde" (1/2/5 × 10^n) pour les graduations de l'axe Y. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

export function TrendLineChart({
  points,
  title,
  realLabel,
  plannedLabel,
  formatValue,
  showArea = false,
  emptyMessage,
}: TrendLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  if (points.length < 2) {
    return <p className="trend-line-chart__empty">{emptyMessage}</p>;
  }

  const maxValue = niceMax(Math.max(...points.map((p) => Math.max(p.real, p.planned))));
  const stepX = PLOT_WIDTH / (points.length - 1);

  const xAt = (i: number) => PAD_LEFT + i * stepX;
  const yAt = (value: number) => PAD_TOP + PLOT_HEIGHT - (value / maxValue) * PLOT_HEIGHT;
  const yBase = yAt(0);

  const realPoints = points.map((p, i) => `${xAt(i)},${yAt(p.real)}`).join(" ");
  const plannedPoints = points.map((p, i) => `${xAt(i)},${yAt(p.planned)}`).join(" ");
  const areaPath =
    `M${xAt(0)},${yBase} ` +
    points.map((p, i) => `L${xAt(i)},${yAt(p.real)}`).join(" ") +
    ` L${xAt(points.length - 1)},${yBase} Z`;

  const labelEvery = points.length > 7 ? Math.ceil(points.length / 6) : 1;
  const active = points[hoveredIndex ?? points.length - 1];

  return (
    <div className="trend-line-chart">
      <svg
        className="trend-line-chart__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{title}</title>

        {[0, 0.5, 1].map((f) => {
          const y = PAD_TOP + PLOT_HEIGHT - f * PLOT_HEIGHT;
          return (
            <g key={f}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={WIDTH - PAD_RIGHT}
                y2={y}
                className="trend-line-chart__grid"
              />
              <text x={PAD_LEFT - 6} y={y + 3} className="trend-line-chart__axis-label" textAnchor="end">
                {Math.round(f * maxValue).toLocaleString("fr-FR")}
              </text>
            </g>
          );
        })}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={p.key}
              x={xAt(i)}
              y={HEIGHT - 8}
              className="trend-line-chart__axis-label"
              textAnchor="middle"
            >
              {p.label}
            </text>
          ) : null,
        )}

        {hoveredIndex !== null && (
          <line
            x1={xAt(hoveredIndex)}
            y1={PAD_TOP}
            x2={xAt(hoveredIndex)}
            y2={PAD_TOP + PLOT_HEIGHT}
            className="trend-line-chart__crosshair"
          />
        )}

        {showArea && <path d={areaPath} className="trend-line-chart__area" />}

        <polyline points={plannedPoints} className="trend-line-chart__line trend-line-chart__line--planned" />
        <polyline points={realPoints} className="trend-line-chart__line trend-line-chart__line--real" />

        {points.map((p, i) => (
          <g key={p.key}>
            <circle
              cx={xAt(i)}
              cy={yAt(p.planned)}
              r="4"
              className="trend-line-chart__dot trend-line-chart__dot--planned"
            />
            <circle
              cx={xAt(i)}
              cy={yAt(p.real)}
              r="4"
              className="trend-line-chart__dot trend-line-chart__dot--real"
            />
            <rect
              x={xAt(i) - Math.max(stepX / 2, 14)}
              y={PAD_TOP}
              width={Math.max(stepX, 28)}
              height={PLOT_HEIGHT}
              className="trend-line-chart__hit"
              tabIndex={0}
              role="img"
              aria-label={`${p.label} : ${realLabel} ${formatValue(p.real)}, ${plannedLabel} ${formatValue(p.planned)}`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(i)}
              onBlur={() => setHoveredIndex(null)}
            />
          </g>
        ))}
      </svg>

      <div className="trend-line-chart__legend">
        <span className="trend-line-chart__legend-item">
          <i className="trend-line-chart__legend-swatch trend-line-chart__legend-swatch--real" />
          {realLabel}
        </span>
        <span className="trend-line-chart__legend-item">
          <i className="trend-line-chart__legend-swatch trend-line-chart__legend-swatch--planned" />
          {plannedLabel}
        </span>
      </div>

      <p className="trend-line-chart__caption">
        <strong>{active.label}</strong> — {realLabel} {formatValue(active.real)} · {plannedLabel}{" "}
        {formatValue(active.planned)}
      </p>

      <button
        type="button"
        className="trend-line-chart__table-toggle"
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? "Masquer le détail" : "Voir le détail"}
      </button>

      {showTable && (
        <div className="trend-line-chart__table-wrap">
          <table className="trend-line-chart__table">
            <thead>
              <tr>
                <th>Mois</th>
                <th>{realLabel}</th>
                <th>{plannedLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td>{formatValue(p.real)}</td>
                  <td>{formatValue(p.planned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
