import "./BudgetSummaryCard.css";

interface BudgetSummaryCardProps {
  totalSpentEUR: number;
  tripTotalBudgetEUR?: number;
  monthLabel: string;
  monthSpentEUR: number;
  monthPrevuEUR: number;
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
  const percent =
    tripTotalBudgetEUR && tripTotalBudgetEUR > 0
      ? Math.round((totalSpentEUR / tripTotalBudgetEUR) * 100)
      : undefined;
  const overBudget = percent !== undefined && percent > 100;

  return (
    <div className={"budget-summary" + (compact ? " budget-summary--compact" : "")}>
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

      {!compact && (
        <p className="budget-summary__month">
          {monthLabel} · {formatEUR(monthSpentEUR)} dépensé
          {monthPrevuEUR > 0 ? ` sur ${formatEUR(monthPrevuEUR)} prévu` : ""}
        </p>
      )}
    </div>
  );
}
