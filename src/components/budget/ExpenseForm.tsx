import { useEffect, useState, type FormEvent } from "react";
import type { Category, Expense, Payer } from "../../lib/types";
import { COMMON_CURRENCIES, convertToEur, getRates } from "../../lib/currency";
import type { Palette } from "../../theme/palette";
import { useSettings } from "../../settings/SettingsProvider";
import { PersonBadge } from "../shared/PersonBadge";
import "./ExpenseForm.css";

interface ExpenseFormProps {
  categories: Category[];
  palette: Palette;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
  /** Dépense à modifier — absent = création. */
  initial?: Expense;
}

const PAYERS: Payer[] = ["justine", "nathan", "both"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseForm({
  categories,
  palette,
  onSave,
  onCancel,
  initial,
}: ExpenseFormProps) {
  const { settings } = useSettings();
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? settings.defaultCurrency);
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [date, setDate] = useState(initial?.date ?? today());
  const [note, setNote] = useState(initial?.note ?? "");
  const [payer, setPayer] = useState<Payer>(initial?.payer ?? "both");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si la devise change pour autre chose que EUR, on vérifie tout de suite
  // que des taux sont disponibles (réseau ou cache) pour éviter une mauvaise
  // surprise à la validation.
  const [ratesNotice, setRatesNotice] = useState<string | null>(null);
  useEffect(() => {
    if (currency === "EUR") {
      setRatesNotice(null);
      return;
    }
    let cancelled = false;
    getRates()
      .then(({ stale }) => {
        if (!cancelled && stale) {
          setRatesNotice(
            "Hors-ligne : conversion basée sur le dernier taux connu.",
          );
        } else if (!cancelled) {
          setRatesNotice(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRatesNotice(
            "Taux de change indisponible (hors-ligne, aucun taux en cache). Connecte-toi au moins une fois pour récupérer les taux.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (!categoryId) {
      setError("Choisis une catégorie.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let amountEUR = parsedAmount;
      if (currency !== "EUR") {
        const { rates } = await getRates();
        amountEUR = convertToEur(parsedAmount, currency, rates);
      }

      const now = Date.now();
      onSave({
        id: initial?.id ?? crypto.randomUUID(),
        amount: parsedAmount,
        currency,
        amountEUR,
        categoryId,
        date,
        note: note || undefined,
        payer,
        createdAt: initial?.createdAt ?? now,
        updatedAt: now,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="expense-form__row">
        <label className="expense-form__field expense-form__field--amount">
          <span>Montant</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </label>
        <label className="expense-form__field expense-form__field--currency">
          <span>Devise</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {ratesNotice && <p className="expense-form__notice">{ratesNotice}</p>}

      <label className="expense-form__field">
        <span>Catégorie</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="expense-form__field">
        <span>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <div className="expense-form__field">
        <span>Qui a payé</span>
        <div className="expense-form__payer-toggle">
          {PAYERS.map((p) => (
            <button
              key={p}
              type="button"
              className={p === payer ? "is-active" : ""}
              onClick={() => setPayer(p)}
            >
              <PersonBadge payer={p} palette={palette} size={18} />
              {p === "both"
                ? "Les deux"
                : p === "justine"
                  ? settings.profileNames.justine
                  : settings.profileNames.nathan}
            </button>
          ))}
        </div>
      </div>

      <label className="expense-form__field">
        <span>Note (optionnel)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note libre…"
        />
      </label>

      {error && <p className="expense-form__error">{error}</p>}

      <div className="expense-form__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Annuler
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
