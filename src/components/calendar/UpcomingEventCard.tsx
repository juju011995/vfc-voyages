import type { AgendaItem } from "../../lib/calendarCalc";
import "./UpcomingEventCard.css";

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "demain";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

export function UpcomingEventCard({ item }: { item?: AgendaItem }) {
  return (
    <div className="upcoming-event">
      {item ? (
        <>
          <p className="upcoming-event__label">Prochain événement</p>
          <p className="upcoming-event__line">
            <strong>{item.title || "(sans titre)"}</strong> — {formatDate(item.date)}
            {item.time ? ` à ${item.time}` : ""}
          </p>
        </>
      ) : (
        <p className="upcoming-event__line">Rien de prévu prochainement</p>
      )}
    </div>
  );
}
