import "./StatsSummaryCard.css";

interface StatsSummaryCardProps {
  totalKm: number;
  countryCount: number;
  /** Cumul réel - cumul prévisionnel, sur la dernière période connue — absent tant qu'il n'y a pas de prévisionnel saisi. */
  cumulativeDeltaEUR?: number;
}

function formatEUR(amount: number): string {
  return Math.abs(amount).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function StatsSummaryCard({ totalKm, countryCount, cumulativeDeltaEUR }: StatsSummaryCardProps) {
  return (
    <div className="stats-summary">
      <p className="stats-summary__eyebrow">Statistiques</p>
      <p className="stats-summary__line">
        <strong>{Math.round(totalKm)} km</strong> parcourus
        {countryCount > 0
          ? ` dans ${countryCount} pays`
          : ""}
      </p>
      {cumulativeDeltaEUR !== undefined && (
        <p className="stats-summary__sub">
          {cumulativeDeltaEUR > 0
            ? `${formatEUR(cumulativeDeltaEUR)} au-dessus du prévisionnel cumulé`
            : cumulativeDeltaEUR < 0
              ? `${formatEUR(cumulativeDeltaEUR)} en dessous du prévisionnel cumulé`
              : "Pile dans le prévisionnel cumulé"}
        </p>
      )}
    </div>
  );
}
