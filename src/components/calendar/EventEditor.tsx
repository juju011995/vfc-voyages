import { useState } from "react";
import type { CalendarEvent } from "../../lib/types";
import "./EventEditor.css";

interface EventEditorProps {
  event: CalendarEvent;
  onClose: () => void;
  onSave: (updates: Partial<CalendarEvent>) => void;
  onDelete: (id: string) => void;
}

export function EventEditor({ event, onClose, onSave, onDelete }: EventEditorProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [date, setDate] = useState(event.date);
  const [endDate, setEndDate] = useState(event.endDate ?? "");
  const [time, setTime] = useState(event.time ?? "");

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      endDate: endDate || undefined,
      time: time || undefined,
    });
  }

  return (
    <div className="event-editor" role="dialog" aria-label="Fiche événement">
      <div className="event-editor__header">
        <input
          type="text"
          className="event-editor__title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l'événement"
          autoFocus
        />
        <button
          type="button"
          className="event-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <div className="event-editor__row">
        <label className="event-editor__field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="event-editor__field">
          <span>Heure (optionnel)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>

      <label className="event-editor__field">
        <span>Jusqu'au (optionnel — pour une réservation sur plusieurs jours)</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>

      <label className="event-editor__field">
        <span>Notes</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Adresse, numéro de réservation, notes libres…"
        />
      </label>

      <div className="event-editor__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Enregistrer
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => onDelete(event.id)}
        >
          Supprimer l'événement
        </button>
      </div>
    </div>
  );
}
