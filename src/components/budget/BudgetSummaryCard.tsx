import "./BudgetSummaryCard.css";

interface BudgetSummaryCardProps {
  totalSpentEUR: number;
  tripTotalBudgetEUR?: number;
  monthLabel: string;
  monthSpentEUR: number;
  monthPrevuEUR: number;
  /** Version compacte (Dashboard) : met en avant le mois en cours plutôt que le total du voyage. */
  compact?: boolean;
}

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function BudgetSummaryCard({
  totalSpentEUR,
  tripTotalBudgetEUR,
  monthLabel,
  monthSpentEUR,
  monthPrevuEUR,
  compact = false,
}: BudgetSummaryCardProps) {
  if (compact) {
    const monthPercent =
      monthPrevuEUR > 0 ? Math.round((monthSpentEUR / monthPrevuEUR) * 100) : undefined;
    const overBudget = monthPercent !== undefined && monthPercent > 100;

    return (
      <div className="budget-summary budget-summary--compact">
        <p className="budget-summary__compact-line">
          <strong>{formatEUR(monthSpentEUR)}</strong> dépensés
          {monthPrevuEUR > 0 ? (
            <>
              {" "}
              sur <strong>{formatEUR(monthPrevuEUR)}</strong> prévu
            </>
          ) : (
            ""
          )}{" "}
          ce mois-ci ({monthLabel})
        </p>

        {monthPercent !== undefined && (
          <div className="budget-summary__bar">
            <div
              className={
                "budget-summary__bar-fill" +
                (overBudget ? " budget-summary__bar-fill--over" : "")
              }
              style={{ width: `${Math.min(monthPercent, 100)}%` }}
            />
          </div>
        )}

        <p className="budget-summary__compact-sub">
          {tripTotalBudgetEUR
            ? `Total voyage : ${formatEUR(totalSpentEUR)} / ${formatEUR(tripTotalBudgetEUR)}`
            : `Total depuis le départ : ${formatEUR(totalSpentEUR)}`}
        </p>
      </div>
    );
  }

  const percent =
    tripTotalBudgetEUR && tripTotalBudgetEUR > 0
      ? Math.round((totalSpentEUR / tripTotalBudgetEUR) * 100)
      : undefined;
  const overBudget = percent !== undefined && percent > 100;

  return (
    <div className="budget-summary">
      <div className="budget-summary__total">
        <span className="budget-summary__amount">{formatEUR(totalSpentEUR)}</span>
        {tripTotalBudgetEUR && (
          <span className="budget-summary__target">
            {" "}
            / {formatEUR(tripTotalBudgetEUR)}
          </span>
        )}
      </div>

      {percent !== undefined && (
        <>
          <div className="budget-summary__bar">
            <div
              className={
                "budget-summary__bar-fill" +
                (overBudget ? " budget-summary__bar-fill--over" : "")
              }
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <p className="budget-summary__percent">
            {percent}% dépensé{overBudget ? " · dépassement" : ""}
          </p>
        </>
      )}

      <p className="budget-summary__month">
        {monthLabel} · {formatEUR(monthSpentEUR)} dépensé
        {monthPrevuEUR > 0 ? ` sur ${formatEUR(monthPrevuEUR)} prévu` : ""}
      </p>
    </div>
  );
}
