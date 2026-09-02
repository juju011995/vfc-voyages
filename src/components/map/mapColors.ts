import type { Palette } from "../../theme/palette";
import type { StopStatus } from "../../lib/types";

/** Couleur littérale (issue de la palette JS) pour un statut d'étape donné. */
export function statusColor(palette: Palette, status: StopStatus): string {
  return status === "visite" ? palette.statusFait : palette.statusAFaire;
}

export function statusLabel(status: StopStatus): string {
  return status === "visite" ? "Visité" : "À visiter";
}
