import type { Palette } from "../../theme/palette";
import type { Payer } from "../../lib/types";
import { useSettings } from "../../settings/SettingsProvider";
import { PersonBadge } from "./PersonBadge";
import "./PayerFilter.css";

export type PayerFilterValue = Payer | "tous";

interface PayerFilterProps {
  value: PayerFilterValue;
  onChange: (value: PayerFilterValue) => void;
  palette: Palette;
}

export function PayerFilter({ value, onChange, palette }: PayerFilterProps) {
  const { settings } = useSettings();
  const initials =
    settings.profileNames.justine.charAt(0).toUpperCase() +
    settings.profileNames.nathan.charAt(0).toUpperCase();

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
          {p === "justine"
            ? settings.profileNames.justine
            : p === "nathan"
              ? settings.profileNames.nathan
              : initials}
        </button>
      ))}
    </div>
  );
}
