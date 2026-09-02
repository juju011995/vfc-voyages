import type { Category } from "../../lib/types";
import type { ProratedSource, WeeklyRecapRow } from "../../lib/budgetCalc";
import "./WeeklyRecap.css";

interface WeeklyRecapProps {
  rows: WeeklyRecapRow[];
  categories: Category[];
}

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function formatMonthShort(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "short",
    timeZone: "UTC",
  });
}

/** "prorata de 100 €/mois" — ou, si la semaine chevauche deux mois, le détail des deux. */
function formatProrataDetail(sources: ProratedSource[]): string {
  if (sources.length === 0) return "";
  if (sources.length === 1) {
    return `prorata de ${formatEUR(sources[0].monthlyAmountEUR)}/mois`;
  }
  return (
    "prorata de " +
    sources
      .map((s) => `${formatEUR(s.monthlyAmountEUR)}/mois en ${formatMonthShort(s.month)}`)
      .join(" + ")
  );
}

export function WeeklyRecap({ rows, categories }: WeeklyRecapProps) {
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  if (rows.length === 0) {
    return (
      <p className="weekly-recap__empty">
        Aucune dépense enregistrée pour l'instant — le récap hebdomadaire
        apparaîtra dès la première dépense saisie.
      </p>
    );
  }

  return (
    <div className="weekly-recap">
      <p className="weekly-recap__intro">
        Le « Prévu » de chaque semaine est le budget mensuel réparti au
        prorata des jours de cette semaine — normal qu'il diffère du montant
        mensuel affiché dans le Prévisionnel juste au-dessus.
      </p>
      {rows.map((row) => (
        <div key={row.weekKey} className="weekly-recap__week">
          <div className="weekly-recap__week-header">
            <h3>Semaine du {row.label}</h3>
            <span
              className={
                "weekly-recap__week-total" +
                (row.totalPrevu > 0 && row.totalReel > row.totalPrevu
                  ? " weekly-recap__week-total--over"
                  : "")
              }
            >
              {formatEUR(row.totalReel)}
              {row.totalPrevu > 0 ? ` / ${formatEUR(row.totalPrevu)} prévu` : ""}
            </span>
          </div>

          <table className="weekly-recap__table">
            <thead>
              <tr>
                <th scope="col">Catégorie</th>
                <th scope="col">Réel</th>
                <th scope="col">Prévu</th>
              </tr>
            </thead>
            <tbody>
              {row.categories.map((cat) => {
                const over = cat.prevuEUR > 0 && cat.reelEUR > cat.prevuEUR;
                return (
                  <tr key={cat.categoryId}>
                    <td>{categoryName(cat.categoryId)}</td>
                    <td className={over ? "weekly-recap__over" : undefined}>
                      {formatEUR(cat.reelEUR)}
                    </td>
                    <td>
                      {cat.prevuEUR > 0 ? (
                        <>
                          <div>{formatEUR(cat.prevuEUR)}</div>
                          <div className="weekly-recap__prevu-detail">
                            {formatProrataDetail(cat.prevuSources)}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
