import type { Category, Expense } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { PersonBadge } from "../shared/PersonBadge";
import "./ExpenseTable.css";

interface ExpenseTableProps {
  expenses: Expense[];
  categories: Category[];
  palette: Palette;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function ExpenseTable({
  expenses,
  categories,
  palette,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  if (expenses.length === 0) {
    return (
      <p className="expense-table__empty">
        Aucune dépense pour ce filtre pour l'instant.
      </p>
    );
  }

  return (
    <ul className="expense-table">
      {expenses.map((expense) => (
        <li key={expense.id} className="expense-table__row">
          <button
            type="button"
            className="expense-table__main"
            onClick={() => onEdit(expense)}
          >
            <span className="expense-table__date">{formatDate(expense.date)}</span>
            <span className="expense-table__info">
              <span className="expense-table__category">
                {categoryName(expense.categoryId)}
              </span>
              {expense.note && (
                <span className="expense-table__note">{expense.note}</span>
              )}
            </span>
            <PersonBadge payer={expense.payer} palette={palette} size={20} />
            <span className="expense-table__amount">
              {formatEUR(expense.amountEUR)}
              {expense.currency !== "EUR" && (
                <span className="expense-table__original">
                  {" "}
                  ({expense.amount} {expense.currency})
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            className="expense-table__delete"
            aria-label={`Supprimer la dépense du ${formatDate(expense.date)}`}
            onClick={() => onDelete(expense.id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
