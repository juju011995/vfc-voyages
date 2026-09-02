import { useState } from "react";
import type { Category } from "../../lib/types";
import "./CategoryManager.css";

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  /** Clic principal sur la pastille : filtre le tableau des dépenses sur cette catégorie. */
  onFilter: (id: string) => void;
}

export function CategoryManager({
  categories,
  onAdd,
  onRename,
  onArchive,
  onFilter,
}: CategoryManagerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const visible = categories.filter((c) => !c.archived);

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewName("");
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function commitEdit() {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    }
    setEditingId(null);
  }

  return (
    <div className="category-manager">
      <ul className="category-manager__list">
        {visible.map((category) => (
          <li key={category.id} className="category-manager__item">
            {editingId === category.id ? (
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
                className="category-manager__name"
                aria-label={`Filtrer les dépenses sur ${category.name}`}
                onClick={() => onFilter(category.id)}
              >
                {category.name}
              </button>
            )}
            <button
              type="button"
              className="category-manager__edit"
              aria-label={`Renommer ${category.name}`}
              onClick={() => startEdit(category)}
            >
              ✎
            </button>
            {!category.isDefault && (
              <button
                type="button"
                className="category-manager__archive"
                aria-label={`Archiver ${category.name}`}
                onClick={() => onArchive(category.id)}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="category-manager__add">
        <input
          type="text"
          placeholder="Nouvelle catégorie…"
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
