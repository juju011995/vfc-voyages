import type { AgendaItem } from "../../lib/calendarCalc";
import type { Palette } from "../../theme/palette";
import type { TaskTag } from "../../lib/types";
import { TAG_TEXT_ON_COLOR } from "../../lib/tagColors";
import { PersonBadge } from "../shared/PersonBadge";
import "./AgendaList.css";

interface AgendaListProps {
  items: AgendaItem[];
  tags: TaskTag[];
  palette: Palette;
  onEditEvent: (eventId: string) => void;
  onOpenTask: () => void;
  emptyLabel: string;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function AgendaList({
  items,
  tags,
  palette,
  onEditEvent,
  onOpenTask,
  emptyLabel,
}: AgendaListProps) {
  if (items.length === 0) {
    return <p className="agenda-list__empty">{emptyLabel}</p>;
  }

  return (
    <ul className="agenda-list">
      {items.map((item) => {
        const tag = item.taskTagId ? tags.find((t) => t.id === item.taskTagId) : undefined;
        const done = item.kind === "task" && item.taskStatus === "fait";

        return (
          <li key={item.id} className="agenda-list__row">
            <button
              type="button"
              className="agenda-list__main"
              onClick={() =>
                item.kind === "event" ? onEditEvent(item.id.replace("event:", "")) : onOpenTask()
              }
            >
              <span className="agenda-list__date-col">
                <span className="agenda-list__date">{formatDate(item.date)}</span>
                {item.time && <span className="agenda-list__time">{item.time}</span>}
              </span>

              <span className="agenda-list__info">
                <span className="agenda-list__title-row">
                  {item.kind === "task" && (
                    <span
                      className="agenda-list__badge"
                      style={
                        tag?.color
                          ? { background: tag.color, color: TAG_TEXT_ON_COLOR }
                          : undefined
                      }
                    >
                      Tâche{tag ? ` · ${tag.name}` : ""}
                    </span>
                  )}
                  <span className={"agenda-list__title" + (done ? " agenda-list__title--done" : "")}>
                    {item.title || "(sans titre)"}
                  </span>
                </span>
                {item.endDate && item.endDate !== item.date && (
                  <span className="agenda-list__range">
                    jusqu'au {formatDate(item.endDate)}
                  </span>
                )}
                {item.description && (
                  <span className="agenda-list__description">{item.description}</span>
                )}
              </span>

              {item.kind === "task" && item.taskAssignee && (
                <PersonBadge payer={item.taskAssignee} palette={palette} size={20} />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
