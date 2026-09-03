import type { MaterielCategory, MaterielItem, MaterielItemStatus, Task } from "../../lib/types";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import { MaterielItemCard } from "./MaterielItemCard";
import "./MaterielItemList.css";

interface MaterielItemListProps {
  categories: MaterielCategory[];
  itemsByCategory: Map<string, MaterielItem[]>;
  linkedTaskByItemId: Map<string, Task>;
  onOpen: (item: MaterielItem) => void;
  onStatusChange: (id: string, status: MaterielItemStatus) => void;
  onAddForCategory: (categoryId: string) => void;
}

export function MaterielItemList({
  categories,
  itemsByCategory,
  linkedTaskByItemId,
  onOpen,
  onStatusChange,
  onAddForCategory,
}: MaterielItemListProps) {
  if (categories.length === 0) {
    return <p className="materiel-item-list__empty">Aucune catégorie pour l'instant.</p>;
  }

  return (
    <div className="materiel-item-list">
      {categories.map((category) => {
        const items = itemsByCategory.get(category.id) ?? [];
        return (
          <div key={category.id} className="materiel-item-list__group">
            <h4
              className="materiel-item-list__group-title"
              style={
                category.color
                  ? { background: category.color, color: TAG_TEXT_ON_COLOR }
                  : undefined
              }
            >
              {category.name}
            </h4>

            {items.length === 0 ? (
              <p className="materiel-item-list__group-empty">Aucun item pour l'instant.</p>
            ) : (
              <div className="materiel-item-list__cards">
                {items.map((item) => (
                  <MaterielItemCard
                    key={item.id}
                    item={item}
                    linkedTask={linkedTaskByItemId.get(item.id)}
                    onOpen={onOpen}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              className="materiel-item-list__add"
              onClick={() => onAddForCategory(category.id)}
            >
              + Ajouter un item dans « {category.name} »
            </button>
          </div>
        );
      })}
    </div>
  );
}
