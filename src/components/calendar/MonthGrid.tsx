import type { AgendaItem } from "../../lib/calendarCalc";
import type { TaskTag } from "../../lib/types";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import "./MonthGrid.css";

interface MonthGridProps {
  month: string; // "YYYY-MM"
  onMonthChange: (month: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  itemsByDate: Map<string, AgendaItem[]>;
  tags: TaskTag[];
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Au-delà, on affiche "+N" plutôt que d'empiler indéfiniment (une case ne
// doit pas devenir illisible si une journée cumule beaucoup d'éléments).
const MAX_ITEMS_PER_CELL = 4;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Grille complète (semaines de 7 jours, lundi en premier), avec les jours hors mois pour compléter. */
function getGridDates(month: string): { date: string; inMonth: boolean }[] {
  const [y, m] = month.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const firstWeekday = firstOfMonth.getUTCDay() || 7; // 1 (lundi) .. 7 (dimanche)
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - (firstWeekday - 1));

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday - 1 + daysInMonth) / 7) * 7;

  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    cells.push({
      date: d.toISOString().slice(0, 10),
      inMonth: d.getUTCMonth() === m - 1,
    });
  }
  return cells;
}

export function MonthGrid({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  itemsByDate,
  tags,
}: MonthGridProps) {
  const cells = getGridDates(month);
  const today = todayIso();

  function itemColor(item: AgendaItem): string | undefined {
    if (item.kind !== "task" || !item.taskTagId) return undefined;
    return tags.find((t) => t.id === item.taskTagId)?.color;
  }

  return (
    <div className="month-grid">
      <div className="month-grid__header">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <h3>{monthLabel(month)}</h3>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>

      <div className="month-grid__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="month-grid__cells">
        {cells.map(({ date, inMonth }) => {
          const items = itemsByDate.get(date) ?? [];
          const dayNumber = Number(date.slice(8, 10));
          return (
            <button
              key={date}
              type="button"
              className={
                "month-grid__cell" +
                (!inMonth ? " month-grid__cell--outside" : "") +
                (date === selectedDate ? " month-grid__cell--selected" : "") +
                (date === today ? " month-grid__cell--today" : "")
              }
              onClick={() => onSelectDate(date)}
              aria-label={`${dayNumber} — ${items.length} élément${items.length > 1 ? "s" : ""}`}
            >
              <span className="month-grid__day-number">{dayNumber}</span>
              {items.length > 0 && (
                <span className="month-grid__items">
                  {items.slice(0, MAX_ITEMS_PER_CELL).map((item) => {
                    const color = itemColor(item);
                    return (
                      <span
                        key={item.id}
                        className="month-grid__item-label"
                        style={color ? { background: color, color: TAG_TEXT_ON_COLOR } : undefined}
                      >
                        {item.title || "(sans titre)"}
                      </span>
                    );
                  })}
                  {items.length > MAX_ITEMS_PER_CELL && (
                    <span className="month-grid__item-more">
                      +{items.length - MAX_ITEMS_PER_CELL}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
