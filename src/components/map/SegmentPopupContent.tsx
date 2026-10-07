import { useEffect, useState } from "react";
import type { RouteSegment, SegmentTransport, TransportMode } from "../../lib/types";
import { COMMON_CURRENCIES, convertToEur, getRates } from "../../lib/currency";
import { formatDistance, formatDuration } from "../../lib/routing";
import { IconFerry, IconTrain, IconPlane } from "../icons/Icons";
import { TransportModeToggle } from "./TransportModeToggle";
import "./SegmentPopupContent.css";

interface SegmentPopupContentProps {
  segment: RouteSegment;
  transport?: SegmentTransport;
  statusLabel: string;
  onSetMode: (mode: TransportMode) => void;
  onSaveDetails: (updates: {
    costAmount?: number;
    costCurrency?: string;
    costAmountEUR?: number;
    durationLabel?: string;
    notes?: string;
  }) => void;
  onRetry: () => void;
}

export function SegmentPopupContent({
  segment,
  transport,
  statusLabel,
  onSetMode,
  onSaveDetails,
  onRetry,
}: SegmentPopupContentProps) {
  const mode = segment.mode ?? "road";
  const [costAmount, setCostAmount] = useState(
    transport?.costAmount !== undefined ? String(transport.costAmount) : "",
  );
  const [costCurrency, setCostCurrency] = useState(transport?.costCurrency ?? "EUR");
  const [durationLabel, setDurationLabel] = useState(transport?.durationLabel ?? "");
  const [notes, setNotes] = useState(transport?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCostAmount(transport?.costAmount !== undefined ? String(transport.costAmount) : "");
    setCostCurrency(transport?.costCurrency ?? "EUR");
    setDurationLabel(transport?.durationLabel ?? "");
    setNotes(transport?.notes ?? "");
  }, [transport?.costAmount, transport?.costCurrency, transport?.durationLabel, transport?.notes]);

  async function handleSaveDetails() {
    setSaving(true);
    try {
      const parsedAmount = costAmount.trim() ? parseFloat(costAmount.replace(",", ".")) : undefined;
      let costAmountEUR: number | undefined;
      if (parsedAmount !== undefined && Number.isFinite(parsedAmount)) {
        if (costCurrency === "EUR") {
          costAmountEUR = parsedAmount;
        } else {
          const { rates } = await getRates();
          costAmountEUR = convertToEur(parsedAmount, costCurrency, rates);
        }
      }
      onSaveDetails({
        costAmount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
        costCurrency,
        costAmountEUR,
        durationLabel: durationLabel.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="segment-popup">
      <strong>
        {statusLabel}
        {segment.stale ? " · hors-ligne" : ""}
      </strong>

      <TransportModeToggle mode={mode} onChange={onSetMode} />

      {mode === "road" && (
        <>
          {segment.noRouteFound ? (
            <div className="segment-popup__notice">
              <p>Aucune route trouvée entre ces deux étapes — choisir bateau, train ou avion ?</p>
              <div className="segment-popup__quick-modes">
                <button type="button" className="btn btn--secondary" onClick={() => onSetMode("ferry")}>
                  <IconFerry /> Ferry
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => onSetMode("train")}>
                  <IconTrain /> Train
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => onSetMode("plane")}>
                  <IconPlane /> Avion
                </button>
              </div>
            </div>
          ) : segment.routingFailed ? (
            <div className="segment-popup__notice">
              <p>Tracé indisponible pour le moment (réseau).</p>
              <button type="button" className="btn btn--secondary" onClick={onRetry}>
                Réessayer
              </button>
            </div>
          ) : (
            <div>
              {formatDistance(segment.distanceMeters)}
              {segment.durationSeconds !== undefined
                ? ` · ${formatDuration(segment.durationSeconds)}`
                : ""}
            </div>
          )}
        </>
      )}

      {mode !== "road" && (
        <div className="segment-popup__transport-form">
          <p className="segment-popup__hint">
            {formatDistance(segment.distanceMeters)} à vol d'oiseau — non comptée dans les km routiers
          </p>

          <label className="segment-popup__field">
            <span>Durée (optionnel)</span>
            <input
              type="text"
              value={durationLabel}
              onChange={(e) => setDurationLabel(e.target.value)}
              placeholder="ex: 20 h"
            />
          </label>

          <div className="segment-popup__row">
            <label className="segment-popup__field">
              <span>Coût</span>
              <input
                type="text"
                inputMode="decimal"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="segment-popup__field segment-popup__field--currency">
              <span>Devise</span>
              <select value={costCurrency} onChange={(e) => setCostCurrency(e.target.value)}>
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="segment-popup__field">
            <span>Note (optionnel)</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Compagnie, réservation…"
            />
          </label>

          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSaveDetails}
            disabled={saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}
