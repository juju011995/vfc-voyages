import type { UpcomingLokiDeadline } from "../../lib/lokiCalc";
import "./LokiSummaryCard.css";

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "demain";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

export function LokiSummaryCard({ deadline }: { deadline?: UpcomingLokiDeadline }) {
  return (
    <div className="loki-summary">
      {deadline ? (
        <>
          <p className="loki-summary__label">
            Prochaine échéance {deadline.kind === "traitement" ? "traitement" : "document"}
          </p>
          <p className="loki-summary__line">
            <strong>{deadline.title}</strong> —{" "}
            {deadline.overdue ? "dépassée le " : ""}
            {formatDate(deadline.dueDate)}
          </p>
        </>
      ) : (
        <p className="loki-summary__line">Aucune échéance Loki à venir</p>
      )}
    </div>
  );
}
