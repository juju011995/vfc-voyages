import { useState } from "react";
import type { Treatment, TreatmentType } from "../../lib/types";
import "./TreatmentEditor.css";

const TYPES: TreatmentType[] = ["antiparasitaire", "vermifuge", "autre"];
const TYPE_LABELS: Record<TreatmentType, string> = {
  antiparasitaire: "Antiparasitaire",
  vermifuge: "Vermifuge",
  autre: "Autre",
};

interface TreatmentEditorProps {
  treatment: Treatment;
  onClose: () => void;
  onSave: (updates: Partial<Treatment>) => void;
  onDelete: (id: string) => void;
}

export function TreatmentEditor({
  treatment,
  onClose,
  onSave,
  onDelete,
}: TreatmentEditorProps) {
  const [type, setType] = useState<TreatmentType>(treatment.type);
  const [product, setProduct] = useState(treatment.product ?? "");
  const [date, setDate] = useState(treatment.date);
  const [nextDueDate, setNextDueDate] = useState(treatment.nextDueDate ?? "");
  const [notes, setNotes] = useState(treatment.notes ?? "");

  function handleSave() {
    onSave({
      type,
      product: product.trim() || undefined,
      date,
      nextDueDate: nextDueDate || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="treatment-editor" role="dialog" aria-label="Fiche traitement">
      <div className="treatment-editor__header">
        <h3>Traitement</h3>
        <button
          type="button"
          className="treatment-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <div className="treatment-editor__field">
        <span>Type</span>
        <div className="treatment-editor__toggle">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={t === type ? "is-active" : ""}
              onClick={() => setType(t)}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <label className="treatment-editor__field">
        <span>Produit</span>
        <input
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Nom du produit"
        />
      </label>

      <div className="treatment-editor__row">
        <label className="treatment-editor__field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="treatment-editor__field">
          <span>Prochain rappel</span>
          <input
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
          />
        </label>
      </div>

      <label className="treatment-editor__field">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes libres…"
        />
      </label>

      <div className="treatment-editor__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Enregistrer
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => onDelete(treatment.id)}
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
