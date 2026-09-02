import { useEffect, useMemo, useState } from "react";
import {
  deleteExpense,
  getBudgetSettings,
  listBudgetPlans,
  listCategories,
  listExpenses,
  listMaterielItems,
  saveBudgetPlan,
  saveBudgetSettings,
  saveCategory,
  saveExpense,
} from "../lib/db";
import {
  buildWeeklyRecap,
  expensesInMonth,
  getVisitedKm,
  totalsByCategory,
} from "../lib/budgetCalc";
import { countMaterielItems, spentPriceEUR, totalPriceEUR } from "../lib/materielCalc";
import type { BudgetPlan, BudgetSettings, Category, Expense, MaterielItem } from "../lib/types";
import { useTheme } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import { BudgetSummaryCard } from "../components/budget/BudgetSummaryCard";
import { PayerFilter, type PayerFilterValue } from "../components/shared/PayerFilter";
import { TagFilter, type TagFilterValue } from "../components/shared/TagFilter";
import { TagManager } from "../components/shared/TagManager";
import { ExpenseForm } from "../components/budget/ExpenseForm";
import { ExpenseTable } from "../components/budget/ExpenseTable";
import { BudgetPlanEditor } from "../components/budget/BudgetPlanEditor";
import { WeeklyRecap } from "../components/budget/WeeklyRecap";
import { FuelEstimateCard } from "../components/budget/FuelEstimateCard";
import { MaterielSummaryCard } from "../components/budget/MaterielSummaryCard";
import "./BudgetPage.css";

type SubTab = "apercu" | "depenses" | "previsionnel";

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function BudgetPage() {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);

  const [subTab, setSubTab] = useState<SubTab>("apercu");
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null);
  const [visitedKm, setVisitedKm] = useState(0);
  const [materielItems, setMaterielItems] = useState<MaterielItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [payerFilter, setPayerFilter] = useState<PayerFilterValue>("tous");
  const [categoryFilter, setCategoryFilter] = useState<TagFilterValue>("tous");
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [planMonth, setPlanMonth] = useState(currentMonthKey());
  const [tripBudgetInput, setTripBudgetInput] = useState("");
  const [editingTripBudget, setEditingTripBudget] = useState(false);

  useEffect(() => {
    (async () => {
      const [cats, exps, plans, settings, km, materiel] = await Promise.all([
        listCategories(),
        listExpenses(),
        listBudgetPlans(),
        getBudgetSettings(),
        getVisitedKm(),
        listMaterielItems(),
      ]);
      setCategories(cats);
      setExpenses(exps);
      setBudgetPlans(plans);
      setBudgetSettings(settings);
      setVisitedKm(km);
      setMaterielItems(materiel);
      setTripBudgetInput(
        settings.tripTotalBudgetEUR ? String(settings.tripTotalBudgetEUR) : "",
      );
      setLoaded(true);
    })();
  }, []);

  const totalSpentEUR = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amountEUR, 0),
    [expenses],
  );

  const thisMonth = currentMonthKey();
  const thisMonthExpenses = useMemo(
    () => expensesInMonth(expenses, thisMonth),
    [expenses, thisMonth],
  );
  const thisMonthSpent = useMemo(
    () => thisMonthExpenses.reduce((sum, e) => sum + e.amountEUR, 0),
    [thisMonthExpenses],
  );
  const thisMonthPrevu = useMemo(
    () =>
      budgetPlans
        .filter((p) => p.month === thisMonth)
        .reduce((sum, p) => sum + p.amountEUR, 0),
    [budgetPlans, thisMonth],
  );

  const filteredExpenses = useMemo(
    () =>
      expenses
        .filter((e) => payerFilter === "tous" || e.payer === payerFilter)
        .filter((e) => categoryFilter === "tous" || e.categoryId === categoryFilter),
    [expenses, payerFilter, categoryFilter],
  );

  const weeklyRows = useMemo(
    () => buildWeeklyRecap(expenses, budgetPlans, categories),
    [expenses, budgetPlans, categories],
  );

  const planMonthExpenses = useMemo(
    () => expensesInMonth(expenses, planMonth),
    [expenses, planMonth],
  );
  const spentByCategoryForPlanMonth = useMemo(
    () => totalsByCategory(planMonthExpenses),
    [planMonthExpenses],
  );
  const plansForPlanMonth = useMemo(
    () => budgetPlans.filter((p) => p.month === planMonth),
    [budgetPlans, planMonth],
  );

  async function handleSaveExpense(expense: Expense) {
    await saveExpense(expense);
    setExpenses((prev) => {
      const exists = prev.some((e) => e.id === expense.id);
      const next = exists
        ? prev.map((e) => (e.id === expense.id ? expense : e))
        : [expense, ...prev];
      return [...next].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
      );
    });
    setShowForm(false);
    setEditingExpense(undefined);
  }

  async function handleDeleteExpense(id: string) {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (editingExpense?.id === id) {
      setShowForm(false);
      setEditingExpense(undefined);
    }
  }

  async function handleAddCategory(name: string) {
    const category: Category = {
      id: crypto.randomUUID(),
      name,
      isDefault: false,
      createdAt: Date.now(),
    };
    await saveCategory(category);
    setCategories((prev) => [...prev, category]);
  }

  async function handleRenameCategory(id: string, name: string) {
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    const updated = { ...category, name };
    await saveCategory(updated);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleArchiveCategory(id: string) {
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    const updated = { ...category, archived: true };
    await saveCategory(updated);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleSavePlan(categoryId: string, amountEUR: number) {
    const existing = budgetPlans.find(
      (p) => p.month === planMonth && p.categoryId === categoryId,
    );
    const plan: BudgetPlan = {
      id: existing?.id ?? crypto.randomUUID(),
      month: planMonth,
      categoryId,
      amountEUR,
      updatedAt: Date.now(),
    };
    await saveBudgetPlan(plan);
    setBudgetPlans((prev) => {
      const exists = prev.some(
        (p) => p.month === plan.month && p.categoryId === plan.categoryId,
      );
      return exists
        ? prev.map((p) =>
            p.month === plan.month && p.categoryId === plan.categoryId ? plan : p,
          )
        : [...prev, plan];
    });
  }

  async function handleSaveFuelSettings(settings: BudgetSettings) {
    await saveBudgetSettings(settings);
    setBudgetSettings(settings);
  }

  async function handleSaveTripBudget() {
    if (!budgetSettings) return;
    const parsed = parseFloat(tripBudgetInput.replace(",", "."));
    const updated: BudgetSettings = {
      ...budgetSettings,
      tripTotalBudgetEUR: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    };
    await saveBudgetSettings(updated);
    setBudgetSettings(updated);
    setEditingTripBudget(false);
  }

  if (!loaded || !budgetSettings) {
    return <p className="budget-page__loading">Chargement…</p>;
  }

  return (
    <div className="budget-page">
      <div className="budget-page__toolbar" role="tablist" aria-label="Sections du budget">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "apercu"}
          className={subTab === "apercu" ? "is-active" : ""}
          onClick={() => setSubTab("apercu")}
        >
          Vue d'ensemble
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "depenses"}
          className={subTab === "depenses" ? "is-active" : ""}
          onClick={() => setSubTab("depenses")}
        >
          Dépenses
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "previsionnel"}
          className={subTab === "previsionnel" ? "is-active" : ""}
          onClick={() => setSubTab("previsionnel")}
        >
          Prévisionnel
        </button>
      </div>

      {subTab === "apercu" && (
        <div className="budget-page__section">
          <BudgetSummaryCard
            totalSpentEUR={totalSpentEUR}
            tripTotalBudgetEUR={budgetSettings.tripTotalBudgetEUR}
            monthLabel={monthLabel(thisMonth)}
            monthSpentEUR={thisMonthSpent}
            monthPrevuEUR={thisMonthPrevu}
          />

          <div className="budget-page__trip-budget">
            {editingTripBudget ? (
              <div className="budget-page__trip-budget-edit">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Budget total du voyage (€)"
                  value={tripBudgetInput}
                  onChange={(e) => setTripBudgetInput(e.target.value)}
                  autoFocus
                />
                <button type="button" className="btn btn--primary" onClick={handleSaveTripBudget}>
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="budget-page__trip-budget-toggle"
                onClick={() => setEditingTripBudget(true)}
              >
                {budgetSettings.tripTotalBudgetEUR
                  ? "Modifier le budget total du voyage"
                  : "Définir un budget total pour le voyage"}
              </button>
            )}
          </div>

          <FuelEstimateCard
            visitedKm={visitedKm}
            settings={budgetSettings}
            onSave={handleSaveFuelSettings}
          />

          <MaterielSummaryCard
            totalEUR={totalPriceEUR(materielItems)}
            spentEUR={spentPriceEUR(materielItems)}
            counts={countMaterielItems(materielItems)}
          />
        </div>
      )}

      {subTab === "depenses" && (
        <div className="budget-page__section">
          <div className="budget-page__expenses-header">
            <PayerFilter value={payerFilter} onChange={setPayerFilter} palette={palette} />
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setEditingExpense(undefined);
                setShowForm(true);
              }}
            >
              + Ajouter une dépense
            </button>
          </div>

          <TagFilter
            items={categories}
            value={categoryFilter}
            onChange={setCategoryFilter}
            allLabel="Toutes catégories"
          />

          {showForm && (
            <ExpenseForm
              categories={categories.filter((c) => !c.archived)}
              palette={palette}
              initial={editingExpense}
              onCancel={() => {
                setShowForm(false);
                setEditingExpense(undefined);
              }}
              onSave={handleSaveExpense}
            />
          )}

          <ExpenseTable
            expenses={filteredExpenses}
            categories={categories}
            palette={palette}
            onEdit={(expense) => {
              setEditingExpense(expense);
              setShowForm(true);
            }}
            onDelete={handleDeleteExpense}
          />
        </div>
      )}

      {subTab === "previsionnel" && (
        <div className="budget-page__section">
          <BudgetPlanEditor
            month={planMonth}
            onMonthChange={setPlanMonth}
            categories={categories}
            plans={plansForPlanMonth}
            spentByCategory={spentByCategoryForPlanMonth}
            onSave={handleSavePlan}
          />

          <TagManager
            items={categories}
            addPlaceholder="Nouvelle catégorie…"
            onAdd={handleAddCategory}
            onRename={handleRenameCategory}
            onArchive={handleArchiveCategory}
            onFilter={(id) => {
              setCategoryFilter(id);
              setSubTab("depenses");
            }}
          />

          <h3 className="budget-page__recap-title">Récap hebdomadaire</h3>
          <WeeklyRecap rows={weeklyRows} categories={categories} />
        </div>
      )}
    </div>
  );
}
