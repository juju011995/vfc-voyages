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

/**
 * Teinte bleu-sauge pour le statut d'achat "Déjà possédé" du module
 * Matériel — volontairement hors de STATUS_STAGE_COLOR : ce n'est pas une 4e
 * étape d'avancement (à faire/en cours/fait), juste une catégorie à part
 * ("je l'ai déjà, rien à acheter"), donc pas de StatusStage partagé avec le
 * module Tâches pour elle. Même famille pastel + texte sombre que les 3
 * autres statuts (contraste élevé en clair ET en sombre, la pastille ayant
 * son propre fond plein), mais nettement plus bleutée/saturée que le vert
 * "fait" ou l'ambré "en cours" pour rester identifiable au premier regard.
 */
export const MATERIEL_DEJA_POSSEDE_COLOR = "#7FC4C9";
