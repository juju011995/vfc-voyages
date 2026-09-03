import type { MaintenanceStatus } from "../../lib/vehicleCalc";
import "./VehicleSummaryCard.css";

function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString("fr-FR")} km`;
}

export function VehicleSummaryCard({ mostUrgent }: { mostUrgent?: MaintenanceStatus }) {
  return (
    <div className="vehicle-summary">
      <p className="vehicle-summary__label">Véhicule</p>
      {mostUrgent && mostUrgent.remainingKm !== undefined ? (
        <p className="vehicle-summary__line">
          <strong>{mostUrgent.type.name}</strong>{" "}
          {mostUrgent.remainingKm > 0
            ? mostUrgent.urgency === "due-soon"
              ? `bientôt (dans ${formatKm(mostUrgent.remainingKm)})`
              : `dans ${formatKm(mostUrgent.remainingKm)}`
            : `dépassée de ${formatKm(-mostUrgent.remainingKm)}`}
        </p>
      ) : (
        <p className="vehicle-summary__line">Entretien à jour</p>
      )}
    </div>
  );
}
