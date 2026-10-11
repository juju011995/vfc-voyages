import { useEffect, useState } from "react";
import type {
  MaterielCategory,
  MaterielEmbarkmentStatus,
  MaterielItem,
  MaterielItemStatus,
  Task,
} from "../../lib/types";
import {
  effectiveEmbarkmentStatus,
  embarkmentAfterPurchaseChange,
  MATERIEL_EMBARKMENT_LABELS,
  MATERIEL_STATUS_LABELS,
  materielEmbarkmentColor,
  materielStatusColor,
  purchaseAfterEmbarkmentChange,
} from "../../lib/materielCalc";
import { STATUS_TEXT_ON_COLOR } from "../../lib/statusColors";
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
const EMBARKMENT_STATUSES: MaterielEmbarkmentStatus[] = ["a-prendre", "possede", "installe"];

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
  const [embarkmentStatus, setEmbarkmentStatus] = useState<MaterielEmbarkmentStatus>(
    effectiveEmbarkmentStatus(item),
  );
  const [price, setPrice] = useState(item.priceEUR !== undefined ? String(item.priceEUR) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [taskToLink, setTaskToLink] = useState("");
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null);

  useEffect(() => {
    setName(item.name);
    setCategoryId(item.categoryId);
    setQuantity(String(item.quantity));
    setStatus(item.status);
    setEmbarkmentStatus(effectiveEmbarkmentStatus(item));
    setPrice(item.priceEUR !== undefined ? String(item.priceEUR) : "");
    setNotes(item.notes ?? "");
    setAutoSwitchNotice(null);
  }, [
    item.id,
    item.name,
    item.categoryId,
    item.quantity,
    item.status,
    item.embarkmentStatus,
    item.priceEUR,
    item.notes,
  ]);

  // Statut d'achat changé → répercute automatiquement sur l'embarquement
  // (ex. "Acheté" avance "à prendre" vers "possédé"), sans jamais faire
  // reculer un objet déjà "installé" — même règle que partout ailleurs.
  function handleStatusClick(newStatus: MaterielItemStatus) {
    setStatus(newStatus);
    setEmbarkmentStatus((current) => embarkmentAfterPurchaseChange(current, newStatus));
    setAutoSwitchNotice(null);
  }

  // Statut d'embarquement changé → si on marque "possédé"/"installé" un
  // objet pas encore acheté, l'achat passe à "déjà possédé" (modifiable).
  function handleEmbarkmentClick(newEmbarkmentStatus: MaterielEmbarkmentStatus) {
    setEmbarkmentStatus(newEmbarkmentStatus);
    const nextStatus = purchaseAfterEmbarkmentChange(status, newEmbarkmentStatus);
    if (nextStatus !== status) {
      setStatus(nextStatus);
      setAutoSwitchNotice(
        "Statut d'achat passé automatiquement à « Déjà possédé » — change-le en « Acheté » si tu préfères.",
      );
    } else {
      setAutoSwitchNotice(null);
    }
  }

  function handleSave() {
    if (!name.trim()) return;
    const parsedQuantity = parseInt(quantity, 10);
    const parsedPrice = parseFloat(price.replace(",", "."));
    onSave({
      name: name.trim(),
      categoryId,
      quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1,
      status,
      embarkmentStatus,
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
          {status === "deja-possede" && (
            <span className="materiel-item-editor__hint">Non compté dans le budget matériel</span>
          )}
        </label>
      </div>

      <div className="materiel-item-editor__field">
        <span>Statut d'achat</span>
        <div className="materiel-item-editor__toggle">
          {STATUSES.map((s) => {
            const color = materielStatusColor(s);
            const active = s === status;
            return (
              <button
                key={s}
                type="button"
                className={active ? "is-active" : ""}
                style={
                  active
                    ? { background: color, color: STATUS_TEXT_ON_COLOR, borderColor: color }
                    : { borderColor: color }
                }
                onClick={() => handleStatusClick(s)}
              >
                {MATERIEL_STATUS_LABELS[s]}
              </button>
            );
          })}
          {(() => {
            const color = materielStatusColor("deja-possede");
            const active = status === "deja-possede";
            return (
              <button
                type="button"
                className={"materiel-item-editor__deja-possede" + (active ? " is-active" : "")}
                style={
                  active
                    ? { background: color, color: STATUS_TEXT_ON_COLOR, borderColor: color }
                    : { borderColor: color }
                }
                onClick={() => handleStatusClick("deja-possede")}
              >
                {MATERIEL_STATUS_LABELS["deja-possede"]}
              </button>
            );
          })()}
        </div>
      </div>

      <div className="materiel-item-editor__field">
        <span>Statut d'embarquement (à charger dans la cellule)</span>
        <div className="materiel-item-editor__toggle">
          {EMBARKMENT_STATUSES.map((s) => {
            const color = materielEmbarkmentColor(s);
            const active = s === embarkmentStatus;
            return (
              <button
                key={s}
                type="button"
                className={active ? "is-active" : ""}
                style={
                  active
                    ? { background: color, color: STATUS_TEXT_ON_COLOR, borderColor: color }
                    : { borderColor: color }
                }
                onClick={() => handleEmbarkmentClick(s)}
              >
                {MATERIEL_EMBARKMENT_LABELS[s]}
              </button>
            );
          })}
        </div>
        {autoSwitchNotice && (
          <p className="materiel-item-editor__notice">{autoSwitchNotice}</p>
        )}
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
