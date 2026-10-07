import type { ReactElement } from "react";
import type { TransportMode } from "../../lib/types";
import { IconVan, IconFerry, IconTrain, IconPlane } from "../icons/Icons";
import "./TransportModeToggle.css";

export const TRANSPORT_MODES: TransportMode[] = ["road", "ferry", "train", "plane"];

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  road: "Route",
  ferry: "Ferry",
  train: "Train",
  plane: "Avion",
};

export const TRANSPORT_MODE_ICONS: Record<TransportMode, () => ReactElement> = {
  road: IconVan,
  ferry: IconFerry,
  train: IconTrain,
  plane: IconPlane,
};

interface TransportModeToggleProps {
  mode: TransportMode;
  onChange: (mode: TransportMode) => void;
}

/** Sélecteur de mode de transport (route/ferry/train/avion) — réutilisé par le popup de segment (Carte) et la fiche d'étape. */
export function TransportModeToggle({ mode, onChange }: TransportModeToggleProps) {
  return (
    <div className="transport-mode-toggle" role="tablist" aria-label="Mode de transport">
      {TRANSPORT_MODES.map((m) => {
        const Icon = TRANSPORT_MODE_ICONS[m];
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? "is-active" : ""}
            onClick={() => onChange(m)}
          >
            <Icon />
            <span>{TRANSPORT_MODE_LABELS[m]}</span>
          </button>
        );
      })}
    </div>
  );
}
