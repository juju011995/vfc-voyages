import type { Payer } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import "./PersonBadge.css";

interface PersonBadgeProps {
  payer: Payer;
  palette: Palette;
  size?: number;
  showLabel?: boolean;
}

const LABELS: Record<Payer, string> = {
  justine: "Justine",
  nathan: "Nathan",
  both: "Justine + Nathan",
};

/**
 * Avatar d'identité — jamais de sens fonctionnel porté par la couleur seule :
 * initiale(s) toujours visibles. Une personne = pastille simple ; les deux =
 * pastille bicolore unique (plus lisible à petite taille que deux avatars
 * empilés), conformément à la charte graphique.
 */
export function PersonBadge({
  payer,
  palette,
  size = 22,
  showLabel = false,
}: PersonBadgeProps) {
  return (
    <span className="person-badge">
      {payer === "both" ? (
        <span
          className="person-badge__dot person-badge__dot--split"
          style={{
            width: size,
            height: size,
            background: `linear-gradient(90deg, ${palette.justine} 50%, ${palette.nathan} 50%)`,
          }}
          aria-hidden="true"
        />
      ) : (
        <span
          className="person-badge__dot"
          style={{
            width: size,
            height: size,
            background: payer === "justine" ? palette.justine : palette.nathan,
          }}
          aria-hidden="true"
        >
          {LABELS[payer].charAt(0)}
        </span>
      )}
      {showLabel && (
        <span className="person-badge__label">{LABELS[payer]}</span>
      )}
      {!showLabel && <span className="sr-only">{LABELS[payer]}</span>}
    </span>
  );
}
