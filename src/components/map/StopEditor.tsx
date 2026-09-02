import { useEffect, useState } from "react";
import type { Stop, StopStatus } from "../../lib/types";
import "./StopEditor.css";

interface StopEditorProps {
  stop: Stop;
  onClose: () => void;
  onSave: (updates: Partial<Stop>) => void;
  onDelete: (id: string) => void;
}

export function StopEditor({ stop, onClose, onSave, onDelete }: StopEditorProps) {
  const [datePrevue, setDatePrevue] = useState(stop.datePrevue ?? "");
  const [notes, setNotes] = useState(stop.notes ?? "");
  const [status, setStatus] = useState<StopStatus>(stop.status);

  // Se resynchronise si on sélectionne une autre étape.
  useEffect(() => {
    setDatePrevue(stop.datePrevue ?? "");
    setNotes(stop.notes ?? "");
    setStatus(stop.status);
  }, [stop.id, stop.datePrevue, stop.notes, stop.status]);

  function handleSave() {
    onSave({
      datePrevue: datePrevue || undefined,
      notes: notes || undefined,
      status,
    });
  }

  return (
    <div className="stop-editor" role="dialog" aria-label={`Fiche de ${stop.name}`}>
      <div className="stop-editor__header">
        <h3>{stop.name}</h3>
        <button
          type="button"
          className="stop-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <label className="stop-editor__field">
        <span>Statut</span>
        <div className="stop-editor__status-toggle">
          <button
            type="button"
            className={status === "a-visiter" ? "is-active" : ""}
            onClick={() => setStatus("a-visiter")}
          >
            À visiter
          </button>
          <button
            type="button"
            className={status === "visite" ? "is-active" : ""}
            onClick={() => setStatus("visite")}
          >
            Visité
          </button>
        </div>
      </label>

      <label className="stop-editor__field">
        <span>Date prévue</span>
        <input
          type="date"
          value={datePrevue}
          onChange={(e) => setDatePrevue(e.target.value)}
        />
      </label>

      <label className="stop-editor__field">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Notes libres sur cette étape…"
        />
      </label>

      <div className="stop-editor__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Enregistrer
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => onDelete(stop.id)}
        >
          Supprimer l'étape
        </button>
      </div>
    </div>
  );
}
