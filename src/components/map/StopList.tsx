import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Stop } from "../../lib/types";
import { statusColor, statusLabel } from "./mapColors";
import type { Palette } from "../../theme/palette";
import "./StopList.css";

interface StopListProps {
  stops: Stop[];
  selectedStopId?: string;
  palette: Palette;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onDelete: (id: string) => void;
}

export function StopList({
  stops,
  selectedStopId,
  palette,
  onSelect,
  onReorder,
  onDelete,
}: StopListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...stops];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered.map((s) => s.id));
  }

  if (stops.length === 0) {
    return (
      <div className="stop-list stop-list--empty">
        <p>Aucune étape. Utilise la recherche pour ajouter une destination.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={stops.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="stop-list">
          {stops.map((stop, index) => (
            <SortableStopItem
              key={stop.id}
              stop={stop}
              index={index}
              selected={stop.id === selectedStopId}
              palette={palette}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableStopItem({
  stop,
  index,
  selected,
  palette,
  onSelect,
  onDelete,
}: {
  stop: Stop;
  index: number;
  selected: boolean;
  palette: Palette;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={
        "stop-list__item" + (selected ? " stop-list__item--selected" : "")
      }
    >
      <button
        type="button"
        className="stop-list__drag-handle"
        aria-label={`Réordonner ${stop.name}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <button
        type="button"
        className="stop-list__main"
        onClick={() => onSelect(stop.id)}
      >
        <span className="stop-list__index">{index + 1}</span>
        <span className="stop-list__name">{stop.name}</span>
        <span
          className="stop-list__status"
          style={{ color: statusColor(palette, stop.status) }}
        >
          {statusLabel(stop.status)}
        </span>
      </button>

      <button
        type="button"
        className="stop-list__delete"
        aria-label={`Supprimer ${stop.name}`}
        onClick={() => onDelete(stop.id)}
      >
        ×
      </button>
    </li>
  );
}
