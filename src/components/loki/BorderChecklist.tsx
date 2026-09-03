import { useState } from "react";
import type { BorderRequirement } from "../../lib/types";
import "./BorderChecklist.css";

interface BorderChecklistProps {
  requirements: BorderRequirement[];
  onToggleItem: (country: string, itemId: string) => void;
  onSaveNotes: (country: string, notes: string) => void;
}

export function BorderChecklist({
  requirements,
  onToggleItem,
  onSaveNotes,
}: BorderChecklistProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="border-checklist">
      <p className="border-checklist__banner">
        Ces checklists sont un premier repère basé sur la réglementation
        générale — <strong>les règles changent, à vérifier avant le départ</strong>{" "}
        (site officiel du pays ou vétérinaire).
      </p>

      {requirements.map((req) => {
        const done = req.items.filter((i) => i.done).length;
        const isOpen = expanded === req.country;
        return (
          <div key={req.id} className="border-checklist__country">
            <button
              type="button"
              className="border-checklist__country-header"
              onClick={() => setExpanded(isOpen ? null : req.country)}
              aria-expanded={isOpen}
            >
              <span>{req.country}</span>
              <span className="border-checklist__progress">
                {done}/{req.items.length}
              </span>
            </button>

            {isOpen && (
              <div className="border-checklist__details">
                <ul>
                  {req.items.map((item) => (
                    <li key={item.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => onToggleItem(req.country, item.id)}
                        />
                        <span>{item.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <label className="border-checklist__notes">
                  <span>Notes</span>
                  <textarea
                    defaultValue={req.notes ?? ""}
                    rows={2}
                    placeholder="Ajouts, précisions trouvées, contact consulaire…"
                    onBlur={(e) => onSaveNotes(req.country, e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
