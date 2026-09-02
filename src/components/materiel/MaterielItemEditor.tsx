import { useEffect, useState } from "react";
import type { MaterielCategory, MaterielItem, MaterielItemStatus, Task } from "../../lib/types";
import { MATERIEL_STATUS_LABELS } from "../../lib/materielCalc";
import "./MaterielItemEditor.css";

interface MaterielItemEditorProps {
  item: MaterielItem;
  categories: MaterielCategory[];
  linkedTask?: Task;
  /** Tâches non déjà liées à un autre item — candidates pour un nouveau lien. */
  linkableTasks: Task[];
  onClose: () => void;
  onSave: (updates: Partial<MaterielItem>) => void;
  onDelete: (id: string) => void;
  onLinkTask: (taskId: string) => void;
  onUnlinkTask: () => void;
}

const STATUSES: MaterielItemStatus[] = ["a-acheter", "en-cours", "achete"];

export function MaterielItemEditor({
  item,
  categories,
  linkedTask,
  linkableTasks,
  onClose,
  onSave,
  onDelete,
  onLinkTask,
  onUnlinkTask,
}: MaterielItemEditorProps) {
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [status, setStatus] = useState<MaterielItemStatus>(item.status);
  const [price, setPrice] = useState(item.priceEUR !== undefined ? String(item.priceEUR) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [taskToLink, setTaskToLink] = useState("");

  useEffect(() => {
    setName(item.name);
    setCategoryId(item.categoryId);
    setQuantity(String(item.quantity));
    setStatus(item.status);
    setPrice(item.priceEUR !== undefined ? String(item.priceEUR) : "");
    setNotes(item.notes ?? "");
  }, [item.id, item.name, item.categoryId, item.quantity, item.status, item.priceEUR, item.notes]);

  function handleSave() {
    if (!name.trim()) return;
    const parsedQuantity = parseInt(quantity, 10);
    const parsedPrice = parseFloat(price.replace(",", "."));
    onSave({
      name: name.trim(),
      categoryId,
      quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1,
      status,
      priceEUR: price.trim() && Number.isFinite(parsedPrice) ? parsedPrice : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="materiel-item-editor" role="dialog" aria-label="Fiche item Matériel">
      <div className="materiel-item-editor__header">
        <input
          type="text"
          className="materiel-item-editor__title-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de l'item"
          autoFocus
        />
        <button
          type="button"
          className="materiel-item-editor__close"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </div>

      <label className="materiel-item-editor__field">
        <span>Catégorie</span>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories
            .filter((c) => !c.archived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </label>

      <div className="materiel-item-editor__row">
        <label className="materiel-item-editor__field">
          <span>Quantité</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>

        <label className="materiel-item-editor__field">
          <span>Prix (€)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Non chiffré"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
      </div>

      <div className="materiel-item-editor__field">
        <span>Statut</span>
        <div className="materiel-item-editor__toggle">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={s === status ? "is-active" : ""}
              onClick={() => setStatus(s)}
            >
              {MATERIEL_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <label className="materiel-item-editor__field">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Référence, taille, boutique visée…"
        />
      </label>

      <div className="materiel-item-editor__field">
        <span>Tâche liée</span>
        {linkedTask ? (
          <div className="materiel-item-editor__linked-task">
            <span>{linkedTask.title || "Tâche sans titre"}</span>
            <button type="button" className="btn btn--secondary" onClick={onUnlinkTask}>
              Délier
            </button>
          </div>
        ) : linkableTasks.length > 0 ? (
          <div className="materiel-item-editor__link-picker">
            <select value={taskToLink} onChange={(e) => setTaskToLink(e.target.value)}>
              <option value="">Choisir une tâche…</option>
              {linkableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title || "Tâche sans titre"}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!taskToLink}
              onClick={() => {
                if (taskToLink) {
                  onLinkTask(taskToLink);
                  setTaskToLink("");
                }
              }}
            >
              Lier
            </button>
          </div>
        ) : (
          <p className="materiel-item-editor__no-tasks">
            Aucune tâche disponible à lier (crée-la d'abord dans le module Tâches).
          </p>
        )}
      </div>

      <div className="materiel-item-editor__actions">
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Enregistrer
        </button>
        <button type="button" className="btn btn--danger" onClick={() => onDelete(item.id)}>
          Supprimer l'item
        </button>
      </div>
    </div>
  );
}
