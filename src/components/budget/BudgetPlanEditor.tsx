import { useState } from "react";
import type { BudgetPlan, Category } from "../../lib/types";
import "./BudgetPlanEditor.css";

interface BudgetPlanEditorProps {
  month: string;
  onMonthChange: (month: string) => void;
  categories: Category[];
  plans: BudgetPlan[];
  spentByCategory: Map<string, number>;
  onSave: (categoryId: string, amountEUR: number) => void;
}

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function BudgetPlanEditor({
  month,
  onMonthChange,
  categories,
  plans,
  spentByCategory,
  onSave,
}: BudgetPlanEditorProps) {
  const planByCategory = new Map(plans.map((p) => [p.categoryId, p.amountEUR]));
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function valueFor(categoryId: string): string {
    if (drafts[categoryId] !== undefined) return drafts[categoryId];
    const existing = planByCategory.get(categoryId);
    return existing ? String(existing) : "";
  }

  function commit(categoryId: string) {
    const raw = drafts[categoryId];
    if (raw === undefined) return;
    const parsed = parseFloat(raw.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) {
      onSave(categoryId, parsed);
    }
    setDrafts((d) => {
      const next = { ...d };
      delete next[categoryId];
      return next;
    });
  }

  return (
    <div className="budget-plan-editor">
      <label className="budget-plan-editor__month">
        <span>Mois</span>
        <input
          type="month"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
        />
      </label>

      <ul className="budget-plan-editor__list">
        {categories
          .filter((c) => !c.archived)
          .map((category) => {
            const spent = spentByCategory.get(category.id) ?? 0;
            const planned = planByCategory.get(category.id) ?? 0;
            const over = planned > 0 && spent > planned;
            return (
              <li key={category.id} className="budget-plan-editor__row">
                <span className="budget-plan-editor__name">{category.name}</span>
                <span
                  className={
                    "budget-plan-editor__spent" +
                    (over ? " budget-plan-editor__spent--over" : "")
                  }
                >
                  {formatEUR(spent)} dépensé
                </span>
                <div className="budget-plan-editor__input">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={valueFor(category.id)}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [category.id]: e.target.value }))
                    }
                    onBlur={() => commit(category.id)}
                    onKeyDown={(e) => e.key === "Enter" && commit(category.id)}
                  />
                  <span>€</span>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
