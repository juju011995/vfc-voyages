import { useState } from "react";
import type { VetContact } from "../../lib/types";
import "./VetEditor.css";

interface VetEditorProps {
  contact: VetContact;
  onClose: () => void;
  onSave: (updates: Partial<VetContact>) => void;
  onDelete: (id: string) => void;
}

export function VetEditor({ contact, onClose, onSave, onDelete }: VetEditorProps) {
  const [city, setCity] = useState(contact.city ?? "");
  const [name, setName] = useState(contact.name ?? "");
  const [address, setAddress] = useState(contact.address ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [notes, setNotes] = useState(contact.notes ?? "");

  function handleSave() {
    onSave({
      city: city.trim() || undefined,
      name: name.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="vet-editor" role="dialog" aria-label="Fiche vétérinaire">
      <div className="vet-editor__header">
        <h3>Vétérinaire — {contact.country}</h3>
        <button
          type="button"
          className="vet-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <label className="vet-editor__field">
        <span>Ville</span>
        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
      </label>

      <label className="vet-editor__field">
        <span>Nom de la clinique</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="vet-editor__field">
        <span>Adresse</span>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>

      <label className="vet-editor__field">
        <span>Téléphone</span>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>

      <label className="vet-editor__field">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Horaires, urgences, langue parlée…"
        />
      </label>

      <div className="vet-editor__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Enregistrer
        </button>
        {!contact.prefilled && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => onDelete(contact.id)}
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
