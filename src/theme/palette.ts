// Miroir JS des tokens définis dans tokens.css, nécessaire partout où Leaflet
// (ou tout autre code hors CSS) a besoin d'une couleur littérale plutôt que
// d'une variable CSS — les attributs de présentation SVG de Leaflet ne
// résolvent pas var() de façon fiable sur tous les navigateurs.

export interface Palette {
  action: string;
  actionContrast: string;
  statusEnCours: string;
  statusFait: string;
  statusAFaire: string;
  alert: string;
  justine: string;
  nathan: string;
  bg: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textSecondary: string;
  border: string;
  terracottaDecorative: string;
}

export const lightPalette: Palette = {
  action: "#8c491a",
  actionContrast: "#f9f4ed",
  statusEnCours: "#201e1d",
  statusFait: "#56633f",
  statusAFaire: "#c0b6a5",
  alert: "#643312",
  justine: "#7d4a52",
  nathan: "#3f6470",
  bg: "#ebddc5",
  surface: "#f9f4ed",
  surfaceRaised: "#ffffff",
  text: "#201e1d",
  textSecondary: "#645c50",
  border: "#dcd3c4",
  terracottaDecorative: "#c67139",
};

export const darkPalette: Palette = {
  action: "#f6a06b",
  actionContrast: "#2e2b25",
  statusEnCours: "#f9f4ed",
  statusFait: "#8fae6a",
  statusAFaire: "#8a8073",
  alert: "#f2a26b",
  justine: "#c99aa1",
  nathan: "#8fb3c0",
  bg: "#2e2b25",
  surface: "#474238",
  surfaceRaised: "#524c40",
  text: "#f9f4ed",
  textSecondary: "#cbc2b3",
  border: "#5b5546",
  terracottaDecorative: "#e08a4f",
};

export function getPalette(resolvedTheme: "light" | "dark"): Palette {
  return resolvedTheme === "dark" ? darkPalette : lightPalette;
}
