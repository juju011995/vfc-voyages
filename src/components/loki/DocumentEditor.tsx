import { useState } from "react";
import type { LokiDocument, LokiDocumentType } from "../../lib/types";
import "./DocumentEditor.css";

interface DocumentEditorProps {
  document: LokiDocument;
  onClose: () => void;
  onSave: (updates: Partial<LokiDocument>) => void;
  onDelete: (id: string) => void;
}

export function DocumentEditor({ document, onClose, onSave, onDelete }: DocumentEditorProps) {
  const [title, setTitle] = useState(document.title);
  const [type, setType] = useState<LokiDocumentType>(document.type);
  const [date, setDate] = useState(document.date ?? "");
  const [dueDate, setDueDate] = useState(document.dueDate ?? "");
  const [notes, setNotes] = useState(document.notes ?? "");
  const [driveLink, setDriveLink] = useState(document.driveLink ?? "");

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type,
      date: date || undefined,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      driveLink: driveLink.trim() || undefined,
    });
  }

  return (
    <div className="document-editor" role="dialog" aria-label="Fiche document">
      <div className="document-editor__header">
        <input
          type="text"
          className="document-editor__title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom (ex: Vaccin rage, Passeport européen)"
          autoFocus
        />
        <button
          type="button"
          className="document-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <div className="document-editor__field">
        <span>Type</span>
        <div className="document-editor__toggle">
          <button
            type="button"
            className={type === "vaccin" ? "is-active" : ""}
            onClick={() => setType("vaccin")}
          >
            Vaccin
          </button>
          <button
            type="button"
            className={type === "document" ? "is-active" : ""}
            onClick={() => setType("document")}
          >
            Document
          </button>
        </div>
      </div>

      <div className="document-editor__row">
        <label className="document-editor__field">
          <span>Date d'obtention</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="document-editor__field">
          <span>Échéance / rappel</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

      <label className="document-editor__field">
        <span>Lien Google Drive (document scanné)</span>
        <input
          type="url"
          value={driveLink}
          onChange={(e) => setDriveLink(e.target.value)}
          placeholder="https://drive.google.com/…"
        />
      </label>

      <label className="document-editor__field">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes libres…"
        />
      </label>

      <div className="document-editor__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Enregistrer
        </button>
        <button type="button" className="btn btn--danger" onClick={() => onDelete(document.id)}>
          Supprimer
        </button>
      </div>
    </div>
  );
}
