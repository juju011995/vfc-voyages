import type { Palette } from "../../theme/palette";
import type { Payer } from "../../lib/types";
import { PersonBadge } from "../shared/PersonBadge";
import "./PayerFilter.css";

export type PayerFilterValue = Payer | "tous";

interface PayerFilterProps {
  value: PayerFilterValue;
  onChange: (value: PayerFilterValue) => void;
  palette: Palette;
}

export function PayerFilter({ value, onChange, palette }: PayerFilterProps) {
  return (
    <div className="payer-filter" role="tablist" aria-label="Filtrer par personne">
      <button
        type="button"
        role="tab"
        aria-selected={value === "tous"}
        className={value === "tous" ? "is-active" : ""}
        onClick={() => onChange("tous")}
      >
        Tout
      </button>
      {(["justine", "nathan", "both"] as Payer[]).map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          aria-selected={value === p}
          className={value === p ? "is-active" : ""}
          onClick={() => onChange(p)}
        >
          <PersonBadge payer={p} palette={palette} size={16} />
          {p === "justine" ? "Justine" : p === "nathan" ? "Nathan" : "J+N"}
        </button>
      ))}
    </div>
  );
}
