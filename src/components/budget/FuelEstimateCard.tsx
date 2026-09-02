import { useState } from "react";
import type { BudgetSettings } from "../../lib/types";
import { estimateFuelCost } from "../../lib/budgetCalc";
import "./FuelEstimateCard.css";

interface FuelEstimateCardProps {
  visitedKm: number;
  settings: BudgetSettings;
  onSave: (settings: BudgetSettings) => void;
}

function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function FuelEstimateCard({
  visitedKm,
  settings,
  onSave,
}: FuelEstimateCardProps) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(settings.fuelPricePerLiter));
  const [conso, setConso] = useState(String(settings.vehicleConsumptionL100km));

  const estimated = estimateFuelCost(
    visitedKm,
    settings.vehicleConsumptionL100km,
    settings.fuelPricePerLiter,
  );

  function handleSave() {
    const parsedPrice = parseFloat(price.replace(",", "."));
    const parsedConso = parseFloat(conso.replace(",", "."));
    onSave({
      ...settings,
      fuelPricePerLiter: Number.isFinite(parsedPrice) ? parsedPrice : settings.fuelPricePerLiter,
      vehicleConsumptionL100km: Number.isFinite(parsedConso)
        ? parsedConso
        : settings.vehicleConsumptionL100km,
    });
    setEditing(false);
  }

  return (
    <div className="fuel-estimate">
      <div className="fuel-estimate__header">
        <h3>Carburant estimé</h3>
        <button type="button" className="fuel-estimate__toggle" onClick={() => setEditing((v) => !v)}>
          {editing ? "Fermer" : "Réglages"}
        </button>
      </div>

      <p className="fuel-estimate__amount">{formatEUR(estimated)}</p>
      <p className="fuel-estimate__detail">
        {Math.round(visitedKm)} km parcourus (étapes visitées sur la Carte)
      </p>

      {editing && (
        <div className="fuel-estimate__settings">
          <label>
            <span>Prix carburant (€/L)</span>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label>
            <span>Consommation (L/100km)</span>
            <input
              type="text"
              inputMode="decimal"
              value={conso}
              onChange={(e) => setConso(e.target.value)}
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={handleSave}>
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}
