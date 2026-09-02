// Couleurs de statut partagées entre les modules Tâches et Matériel — un
// statut a la même couleur partout où il apparaît (onglets de statut sur les
// cartes, l'éditeur, les filtres). Puise dans la même famille de pastels que
// tagColors.ts pour rester cohérent avec la charte graphique, mais avec des
// teintes dédiées et fixes (non personnalisables, contrairement aux tags) :
// rosé = à faire, ambré/doré = en cours (volontairement plus clair et plus
// jaune que le terracotta réservé aux boutons d'action, pour ne jamais les
// confondre), vert = fait. N'affecte pas les couleurs de statut du module
// Carte (palette.statusAFaire/EnCours/Fait), qui restent indépendantes.

export type StatusStage = "todo" | "in-progress" | "done";

export const STATUS_STAGE_COLOR: Record<StatusStage, string> = {
  todo: "#FFD1D1", // rosé
  "in-progress": "#FFEAB0", // ambré/doré pâle, distinct du terracotta
  done: "#BDEBC0", // vert menthe pâle
};

/** Texte lisible sur une pastille pleine (statut actif) — fixe, comme TAG_TEXT_ON_COLOR. */
export const STATUS_TEXT_ON_COLOR = "#3a2f22";
