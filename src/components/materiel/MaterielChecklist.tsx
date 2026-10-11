import type {
  MaterielCategory,
  MaterielEmbarkmentStatus,
  MaterielItem,
} from "../../lib/types";
import {
  effectiveEmbarkmentStatus,
  MATERIEL_EMBARKMENT_LABELS,
  materielEmbarkmentColor,
  type MaterielEmbarkmentCounts,
} from "../../lib/materielCalc";
import { STATUS_TEXT_ON_COLOR } from "../../lib/statusColors";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import "./MaterielChecklist.css";

const EMBARKMENT_STATUSES: MaterielEmbarkmentStatus[] = ["a-prendre", "possede", "installe"];

interface MaterielChecklistProps {
  categories: MaterielCategory[];
  itemsByCategory: Map<string, MaterielItem[]>;
  counts: MaterielEmbarkmentCounts;
  onEmbarkmentChange: (id: string, status: MaterielEmbarkmentStatus) => void;
}

export function MaterielChecklist({
  categories,
  itemsByCategory,
  counts,
  onEmbarkmentChange,
}: MaterielChecklistProps) {
  const total = counts.aPrendre + counts.possede + counts.installe;
  const percent = total > 0 ? Math.round((counts.installe / total) * 100) : 0;

  return (
    <div className="materiel-checklist">
      <div className="materiel-checklist__progress">
        <div className="materiel-checklist__progress-bar">
          <div className="materiel-checklist__progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="materiel-checklist__progress-label">
          {counts.installe} / {total} installés
        </p>
        <p className="materiel-checklist__progress-detail">
          {counts.installe} installés · {counts.possede} possédés · {counts.aPrendre} à prendre
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="materiel-checklist__empty">Aucune catégorie pour l'instant.</p>
      ) : [...itemsByCategory.values()].every((list) => list.length === 0) ? (
        <p className="materiel-checklist__empty">Aucun item ne correspond à ce filtre.</p>
      ) : (
        categories.map((category) => {
          const items = itemsByCategory.get(category.id) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={category.id} className="materiel-checklist__group">
              <h4
                className="materiel-checklist__group-title"
                style={
                  category.color
                    ? { background: category.color, color: TAG_TEXT_ON_COLOR }
                    : undefined
                }
              >
                {category.name}
              </h4>
              <div className="materiel-checklist__rows">
                {items.map((item) => {
                  const embarkment = effectiveEmbarkmentStatus(item);
                  const installed = embarkment === "installe";
                  return (
                    <div key={item.id} className="materiel-checklist__row">
                      <label className="materiel-checklist__checkbox">
                        <input
                          type="checkbox"
                          checked={installed}
                          onChange={(e) =>
                            onEmbarkmentChange(item.id, e.target.checked ? "installe" : "possede")
                          }
                          aria-label={`${item.name || "Sans nom"} installé`}
                        />
                      </label>

                      <div className="materiel-checklist__row-info">
                        <span
                          className={
                            "materiel-checklist__row-name" +
                            (installed ? " materiel-checklist__row-name--done" : "")
                          }
                        >
                          {item.name || "Sans nom"}
                        </span>
                        <span className="materiel-checklist__row-qty">×{item.quantity}</span>
                      </div>

                      <div className="materiel-checklist__row-toggle">
                        {EMBARKMENT_STATUSES.map((status) => {
                          const color = materielEmbarkmentColor(status);
                          const active = status === embarkment;
                          return (
                            <button
                              key={status}
                              type="button"
                              className={active ? "is-active" : ""}
                              style={
                                active
                                  ? { background: color, color: STATUS_TEXT_ON_COLOR, borderColor: color }
                                  : { borderColor: color }
                              }
                              onClick={() => onEmbarkmentChange(item.id, status)}
                            >
                              {MATERIEL_EMBARKMENT_LABELS[status]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
