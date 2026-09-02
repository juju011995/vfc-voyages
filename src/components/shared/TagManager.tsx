import { useState } from "react";
import { TAG_COLOR_PALETTE } from "../../lib/tagColors";
import "./TagManager.css";

export interface TaggableItem {
  id: string;
  name: string;
  isDefault: boolean;
  archived?: boolean;
  color?: string;
}

interface TagManagerProps<T extends TaggableItem> {
  items: T[];
  addPlaceholder: string;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  /** Clic principal sur la pastille : filtre la liste liée (dépenses, tâches…) sur cet item. */
  onFilter: (id: string) => void;
  /** Affiche un sélecteur de couleur par item (module Tâches uniquement pour l'instant). */
  showColorPicker?: boolean;
  onColorChange?: (id: string, color: string) => void;
}

/**
 * Liste de tags/catégories extensible et réutilisable entre modules (Budget,
 * Tâches…) : clic sur la pastille = filtre, icône crayon = renommage,
 * archivage réservé aux items non fournis par défaut.
 */
export function TagManager<T extends TaggableItem>({
  items,
  addPlaceholder,
  onAdd,
  onRename,
  onArchive,
  onFilter,
  showColorPicker = false,
  onColorChange,
}: TagManagerProps<T>) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  const visible = items.filter((item) => !item.archived);
  const colorPickerItem = visible.find((item) => item.id === colorPickerId);

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewName("");
  }

  function startEdit(item: T) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function commitEdit() {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    }
    setEditingId(null);
  }

  return (
    <div className="tag-manager">
      <ul className="tag-manager__list">
        {visible.map((item) => (
          <li key={item.id} className="tag-manager__item">
            {showColorPicker && (
              <button
                type="button"
                className="tag-manager__color-dot"
                style={{ background: item.color ?? "transparent" }}
                aria-label={`Couleur de ${item.name}`}
                onClick={() =>
                  setColorPickerId((current) => (current === item.id ? null : item.id))
                }
              />
            )}
            {editingId === item.id ? (
              <input
                type="text"
                value={editingName}
                autoFocus
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => e.key === "Enter" && commitEdit()}
              />
            ) : (
              <button
                type="button"
                className="tag-manager__name"
                aria-label={`Filtrer sur ${item.name}`}
                onClick={() => onFilter(item.id)}
              >
                {item.name}
              </button>
            )}
            <button
              type="button"
              className="tag-manager__edit"
              aria-label={`Renommer ${item.name}`}
              onClick={() => startEdit(item)}
            >
              ✎
            </button>
            {!item.isDefault && (
              <button
                type="button"
                className="tag-manager__archive"
                aria-label={`Archiver ${item.name}`}
                onClick={() => onArchive(item.id)}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      {showColorPicker && colorPickerItem && onColorChange && (
        <div className="tag-manager__color-picker">
          <p>Couleur de « {colorPickerItem.name} »</p>
          <div className="tag-manager__swatches">
            {TAG_COLOR_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                className={
                  "tag-manager__swatch" +
                  (colorPickerItem.color === color ? " is-selected" : "")
                }
                style={{ background: color }}
                aria-label={color}
                onClick={() => onColorChange(colorPickerItem.id, color)}
              />
            ))}
          </div>
          <label className="tag-manager__custom-color">
            <span>Autre couleur…</span>
            <input
              type="color"
              value={colorPickerItem.color ?? "#ffffff"}
              onChange={(e) => onColorChange(colorPickerItem.id, e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="tag-manager__add">
        <input
          type="text"
          placeholder={addPlaceholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button type="button" className="btn btn--secondary" onClick={handleAdd}>
          Ajouter
        </button>
      </div>
    </div>
  );
}
