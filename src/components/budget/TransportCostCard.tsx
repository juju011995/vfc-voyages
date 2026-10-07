import type { SegmentTransport } from "../../lib/types";
import { TRANSPORT_MODE_ICONS, TRANSPORT_MODE_LABELS } from "../map/TransportModeToggle";
import "./TransportCostCard.css";

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function TransportCostCard({ transports }: { transports: SegmentTransport[] }) {
  const otherModes = transports.filter((t) => t.mode !== "road" && t.costAmountEUR);
  const total = otherModes.reduce((sum, t) => sum + (t.costAmountEUR ?? 0), 0);

  return (
    <div className="transport-cost">
      <h3>Transports hors route (estimé)</h3>
      <p className="transport-cost__amount">{formatEUR(total)}</p>
      {otherModes.length === 0 ? (
        <p className="transport-cost__detail">
          Aucun coût de ferry/train/avion renseigné pour l'instant.
        </p>
      ) : (
        <ul className="transport-cost__list">
          {otherModes.map((t) => {
            const Icon = TRANSPORT_MODE_ICONS[t.mode];
            return (
              <li key={t.id}>
                <Icon />
                <span>{TRANSPORT_MODE_LABELS[t.mode]}</span>
                <strong>{formatEUR(t.costAmountEUR ?? 0)}</strong>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
