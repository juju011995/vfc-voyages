import type { MaterielCounts } from "../../lib/materielCalc";
import "./MaterielSummaryCard.css";

interface MaterielSummaryCardProps {
  totalEUR: number;
  spentEUR: number;
  counts: MaterielCounts;
  /** Version compacte (Dashboard). */
  compact?: boolean;
}

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function MaterielSummaryCard({
  totalEUR,
  spentEUR,
  counts,
  compact = false,
}: MaterielSummaryCardProps) {
  const percent = totalEUR > 0 ? Math.round((spentEUR / totalEUR) * 100) : undefined;
  const restant = counts.aAcheter + counts.enCours;

  if (compact) {
    return (
      <div className="materiel-summary materiel-summary--compact">
        <p className="materiel-summary__eyebrow">Budget matériel</p>
        <p className="materiel-summary__compact-line">
          <strong>{formatEUR(spentEUR)}</strong>
          {totalEUR > 0 ? (
            <>
              {" "}
              sur <strong>{formatEUR(totalEUR)}</strong>
            </>
          ) : (
            ""
          )}
        </p>
        <p className="materiel-summary__compact-sub">
          {restant > 0 ? `${restant} item(s) restant(s) à acheter` : "Tout est acheté"}
        </p>
      </div>
    );
  }

  return (
    <div className="materiel-summary">
      <p className="materiel-summary__eyebrow">Budget matériel</p>
      <div className="materiel-summary__total">
        <span className="materiel-summary__amount">{formatEUR(totalEUR)}</span>
        <span className="materiel-summary__target"> au total</span>
      </div>

      {percent !== undefined && (
        <>
          <div className="materiel-summary__bar">
            <div
              className="materiel-summary__bar-fill"
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <p className="materiel-summary__percent">
            {formatEUR(spentEUR)} déjà dépensés ({percent}%)
          </p>
        </>
      )}

      <p className="materiel-summary__counts">
        {counts.aAcheter} à acheter · {counts.enCours} en cours · {counts.achete} achetés
      </p>
    </div>
  );
}
