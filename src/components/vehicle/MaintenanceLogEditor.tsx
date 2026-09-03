import { useState } from "react";
import type { MaintenanceLog, MaintenanceType } from "../../lib/types";
import "./MaintenanceLogEditor.css";

interface MaintenanceLogEditorProps {
  log: MaintenanceLog;
  types: MaintenanceType[];
  onClose: () => void;
  onSave: (updates: Partial<MaintenanceLog>) => void;
  onDelete: (id: string) => void;
}

export function MaintenanceLogEditor({
  log,
  types,
  onClose,
  onSave,
  onDelete,
}: MaintenanceLogEditorProps) {
  const [typeId, setTypeId] = useState(log.typeId);
  const [date, setDate] = useState(log.date);
  const [km, setKm] = useState(String(log.km));
  const [notes, setNotes] = useState(log.notes ?? "");

  function handleSave() {
    const parsedKm = parseInt(km, 10);
    onSave({
      typeId,
      date,
      km: Number.isFinite(parsedKm) && parsedKm >= 0 ? parsedKm : log.km,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="maintenance-log-editor" role="dialog" aria-label="Fiche intervention">
      <div className="maintenance-log-editor__header">
        <h3>Intervention</h3>
        <button
          type="button"
          className="maintenance-log-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <label className="maintenance-log-editor__field">
        <span>Type</span>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          {types
            .filter((t) => !t.archived)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </label>

      <div className="maintenance-log-editor__row">
        <label className="maintenance-log-editor__field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="maintenance-log-editor__field">
          <span>Kilométrage</span>
          <input
            type="text"
            inputMode="numeric"
            value={km}
            onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
      </div>

      <label className="maintenance-log-editor__field">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Garage, pièces changées, coût…"
        />
      </label>

      <div className="maintenance-log-editor__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Enregistrer
        </button>
        <button type="button" className="btn btn--danger" onClick={() => onDelete(log.id)}>
          Supprimer
        </button>
      </div>
    </div>
  );
}
