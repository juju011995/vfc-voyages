import { useState } from "react";
import type { AdminDocument, Payer } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { useSettings } from "../../settings/SettingsProvider";
import { PersonBadge } from "../shared/PersonBadge";
import "./AdminDocumentEditor.css";

interface AdminDocumentEditorProps {
  document: AdminDocument;
  palette: Palette;
  onClose: () => void;
  onSave: (updates: Partial<AdminDocument>) => void;
  onDelete: (id: string) => void;
}

export function AdminDocumentEditor({
  document,
  palette,
  onClose,
  onSave,
  onDelete,
}: AdminDocumentEditorProps) {
  const { settings } = useSettings();
  const [title, setTitle] = useState(document.title);
  const [person, setPerson] = useState<Payer>(document.person);
  const [expiryDate, setExpiryDate] = useState(document.expiryDate ?? "");
  const [notes, setNotes] = useState(document.notes ?? "");
  const [driveLink, setDriveLink] = useState(document.driveLink ?? "");

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      person,
      expiryDate: expiryDate || undefined,
      notes: notes.trim() || undefined,
      driveLink: driveLink.trim() || undefined,
    });
  }

  return (
    <div className="admin-document-editor" role="dialog" aria-label="Fiche document">
      <div className="admin-document-editor__header">
        <input
          type="text"
          className="admin-document-editor__title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom (ex: Passeport, Carte grise)"
          autoFocus
        />
        <button
          type="button"
          className="admin-document-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <div className="admin-document-editor__field">
        <span>Personne concernée</span>
        <div className="admin-document-editor__toggle">
          {(["justine", "nathan", "both"] as Payer[]).map((p) => (
            <button
              key={p}
              type="button"
              className={person === p ? "is-active" : ""}
              onClick={() => setPerson(p)}
            >
              <PersonBadge payer={p} palette={palette} size={16} />
              {p === "justine"
                ? settings.profileNames.justine
                : p === "nathan"
                  ? settings.profileNames.nathan
                  : "Les deux"}
            </button>
          ))}
        </div>
      </div>

      <label className="admin-document-editor__field">
        <span>Date d'expiration</span>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
      </label>

      <label className="admin-document-editor__field">
        <span>Lien Google Drive (document scanné)</span>
        <input
          type="url"
          value={driveLink}
          onChange={(e) => setDriveLink(e.target.value)}
          placeholder="https://drive.google.com/…"
        />
      </label>

      <label className="admin-document-editor__field">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes libres…"
        />
      </label>

      <div className="admin-document-editor__actions">
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
