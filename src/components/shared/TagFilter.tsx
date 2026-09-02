import type { TaggableItem } from "./TagManager";
import "./TagFilter.css";

export type TagFilterValue = string | "tous";

interface TagFilterProps<T extends TaggableItem> {
  items: T[];
  value: TagFilterValue;
  onChange: (value: TagFilterValue) => void;
  allLabel: string;
}

export function TagFilter<T extends TaggableItem>({
  items,
  value,
  onChange,
  allLabel,
}: TagFilterProps<T>) {
  const visible = items.filter((item) => !item.archived);

  return (
    <div className="tag-filter" role="tablist" aria-label={allLabel}>
      <button
        type="button"
        role="tab"
        aria-selected={value === "tous"}
        className={value === "tous" ? "is-active" : ""}
        onClick={() => onChange("tous")}
      >
        {allLabel}
      </button>
      {visible.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={value === item.id ? "is-active" : ""}
          onClick={() => onChange(item.id)}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}
