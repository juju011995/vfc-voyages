import type { UpcomingAdminDeadline } from "../../lib/adminCalc";
import type { Palette } from "../../theme/palette";
import { PersonBadge } from "../shared/PersonBadge";
import "./AdminSummaryCard.css";

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "demain";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

export function AdminSummaryCard({
  deadline,
  palette,
}: {
  deadline?: UpcomingAdminDeadline;
  palette: Palette;
}) {
  return (
    <div className="admin-summary">
      {deadline ? (
        <>
          <p className="admin-summary__label">Prochaine échéance administrative</p>
          <p className="admin-summary__line">
            <PersonBadge payer={deadline.person} palette={palette} size={18} />
            <strong>{deadline.title}</strong> —{" "}
            {deadline.overdue ? "expiré le " : "expire le "}
            {formatDate(deadline.expiryDate)}
          </p>
        </>
      ) : (
        <p className="admin-summary__line">Aucune échéance administrative à venir</p>
      )}
    </div>
  );
}
