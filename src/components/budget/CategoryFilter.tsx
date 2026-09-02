import type { Category } from "../../lib/types";
import "./CategoryFilter.css";

export type CategoryFilterValue = string | "toutes";

interface CategoryFilterProps {
  categories: Category[];
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  const visible = categories.filter((c) => !c.archived);

  return (
    <div className="category-filter" role="tablist" aria-label="Filtrer par catégorie">
      <button
        type="button"
        role="tab"
        aria-selected={value === "toutes"}
        className={value === "toutes" ? "is-active" : ""}
        onClick={() => onChange("toutes")}
      >
        Toutes catégories
      </button>
      {visible.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={value === category.id}
          className={value === category.id ? "is-active" : ""}
          onClick={() => onChange(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
