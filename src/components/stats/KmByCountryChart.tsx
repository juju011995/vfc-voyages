import { useId, useState } from "react";
import type { KmByCountry } from "../../lib/statsCalc";
import "./KmByCountryChart.css";

interface KmByCountryChartProps {
  data: KmByCountry[];
}

const WIDTH = 320;
const ROW_HEIGHT = 36;
const BAR_HEIGHT = 14;
const PAD_X = 4;
const PAD_TOP = 6;
const VALUE_COLUMN = 46;

export function KmByCountryChart({ data }: KmByCountryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  if (data.length === 0) {
    return (
      <p className="km-country-chart__empty">
        Aucune étape visitée avec un pays connu pour l'instant.
      </p>
    );
  }

  const maxKm = Math.max(...data.map((d) => d.km));
  const barMaxWidth = WIDTH - PAD_X * 2 - VALUE_COLUMN;
  const height = PAD_TOP + data.length * ROW_HEIGHT + 4;

  return (
    <div className="km-country-chart">
      <svg
        className="km-country-chart__svg"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>Kilomètres parcourus par pays</title>
        {data.map((d, i) => {
          const y = PAD_TOP + i * ROW_HEIGHT;
          const barWidth = maxKm > 0 ? Math.max((d.km / maxKm) * barMaxWidth, 3) : 3;
          return (
            <g key={d.country}>
              <text x={PAD_X} y={y + 9} className="km-country-chart__label">
                {d.country}
              </text>
              <rect
                x={PAD_X}
                y={y + 14}
                width={barWidth}
                height={BAR_HEIGHT}
                rx={4}
                className={
                  "km-country-chart__bar" + (hoveredIndex === i ? " is-hovered" : "")
                }
              />
              <text
                x={PAD_X + barWidth + 6}
                y={y + 14 + BAR_HEIGHT / 2 + 3}
                className="km-country-chart__value"
              >
                {Math.round(d.km)} km
              </text>
              <rect
                x={0}
                y={y}
                width={WIDTH}
                height={ROW_HEIGHT}
                className="km-country-chart__hit"
                tabIndex={0}
                role="img"
                aria-label={`${d.country} : ${Math.round(d.km)} kilomètres`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(i)}
                onBlur={() => setHoveredIndex(null)}
              />
            </g>
          );
        })}
      </svg>

      <button
        type="button"
        className="km-country-chart__table-toggle"
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? "Masquer le détail" : "Voir le détail"}
      </button>

      {showTable && (
        <div className="km-country-chart__table-wrap">
          <table className="km-country-chart__table">
            <thead>
              <tr>
                <th>Pays</th>
                <th>Kilomètres</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.country}>
                  <td>{d.country}</td>
                  <td>{Math.round(d.km)} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
