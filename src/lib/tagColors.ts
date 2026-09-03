// Palette de couleurs pour les tags/catégories (module Tâches, et affichage
// dans le Calendrier). Tons pastel délibérément distincts des couleurs
// réservées de la charte (terracotta d'action, identité Justine/Nathan,
// couleurs de statut) pour ne jamais se confondre avec elles.

export const TAG_COLOR_PALETTE = [
  "#FFD1D1", // rose corail pâle
  "#FFDCB8", // pêche
  "#FFEAB0", // miel pâle
  "#F3F0A8", // citron pâle
  "#D9F0B0", // tilleul
  "#BDEBC0", // menthe pâle
  "#B8E8D8", // turquoise pâle
  "#B8E4F0", // ciel pâle
  "#BFD4F5", // bleu poudré
  "#C7C6F2", // lavande pâle
  "#DCC2F0", // mauve pâle
  "#F0C2E8", // orchidée pâle
  "#F5C2D6", // rose bonbon pâle
  "#E8C7B0", // beige rosé
  "#D4C7A8", // sable
  "#A8D8C9", // jade pâle
  "#C9B8E8", // violet pâle
  "#F0D0C2", // abricot pâle
];

/** Texte lisible sur n'importe quelle pastille de la palette ci-dessus (fixe, indépendant du thème clair/sombre). */
export const TAG_TEXT_ON_COLOR = "#3a2f22";

/** Choisit la prochaine couleur de la palette pas encore utilisée (boucle si épuisée). */
export function pickNextTagColor(usedColors: Array<string | undefined>): string {
  const used = new Set(usedColors.filter((c): c is string => Boolean(c)));
  const available = TAG_COLOR_PALETTE.find((c) => !used.has(c));
  if (available) return available;
  return TAG_COLOR_PALETTE[usedColors.length % TAG_COLOR_PALETTE.length];
}
