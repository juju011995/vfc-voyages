import type { Payer } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { useSettings } from "../../settings/SettingsProvider";
import "./PersonBadge.css";

interface PersonBadgeProps {
  payer: Payer;
  palette: Palette;
  size?: number;
  showLabel?: boolean;
}

/**
 * Avatar d'identité — jamais de sens fonctionnel porté par la couleur seule :
 * initiale(s) toujours visibles. Une personne = pastille simple ; les deux =
 * pastille bicolore unique (plus lisible à petite taille que deux avatars
 * empilés), conformément à la charte graphique. Les noms affichés viennent
 * des Paramètres (renommables) ; les couleurs prune/bleu ardoise restent
 * fixes, indépendantes du nom.
 */
export function PersonBadge({
  payer,
  palette,
  size = 22,
  showLabel = false,
}: PersonBadgeProps) {
  const { settings } = useSettings();
  const labels: Record<Payer, string> = {
    justine: settings.profileNames.justine,
    nathan: settings.profileNames.nathan,
    both: `${settings.profileNames.justine} + ${settings.profileNames.nathan}`,
  };

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
          {labels[payer].charAt(0).toUpperCase()}
        </span>
      )}
      {showLabel && (
        <span className="person-badge__label">{labels[payer]}</span>
      )}
      {!showLabel && <span className="sr-only">{labels[payer]}</span>}
    </span>
  );
}
