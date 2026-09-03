import { useState } from "react";
import type { MaintenanceType } from "../../lib/types";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import "./IntervalManager.css";

interface IntervalManagerProps {
  types: MaintenanceType[];
  onChangeInterval: (typeId: string, intervalKm: number | undefined) => void;
}

/**
 * Édition de l'intervalle km par type d'entretien — séparé de TagManager
 * (réutilisé tel quel pour le nom/la couleur/l'archivage) pour ne pas
 * complexifier ce composant partagé avec Budget/Tâches/Matériel.
 */
export function IntervalManager({ types, onChangeInterval }: IntervalManagerProps) {
  const visible = types.filter((t) => !t.archived);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function draftFor(type: MaintenanceType): string {
    return drafts[type.id] ?? (type.intervalKm !== undefined ? String(type.intervalKm) : "");
  }

  function commit(type: MaintenanceType) {
    const raw = draftFor(type).trim();
    const parsed = raw ? parseInt(raw, 10) : undefined;
    onChangeInterval(type.id, parsed !== undefined && parsed > 0 ? parsed : undefined);
  }

  return (
    <ul className="interval-manager">
      {visible.map((type) => (
        <li key={type.id} className="interval-manager__row">
          <span
            className="interval-manager__type"
            style={type.color ? { background: type.color, color: TAG_TEXT_ON_COLOR } : undefined}
          >
            {type.name}
          </span>
          <label className="interval-manager__field">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Aucun"
              value={draftFor(type)}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [type.id]: e.target.value.replace(/[^\d]/g, ""),
                }))
              }
              onBlur={() => commit(type)}
            />
            <span>km</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
