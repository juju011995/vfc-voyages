// Données de référence pour la présélection du module Loki — pays de
// l'itinéraire (cahier des charges §8) et checklist frontalière par pays.
//
// ⚠️ Premier jet basé sur la réglementation UE de circulation des animaux de
// compagnie (règlement 576/2013, passeport européen) telle que documentée en
// septembre 2026, vérifiée par recherche web au moment de la construction de
// ce module — PAS une source juridique. Les règles changent : chaque fiche
// pré-remplie reste marquée « à vérifier avant le départ » dans l'interface,
// conformément au cahier des charges.

import type { Stop } from "./types";

export const LOKI_COUNTRIES = [
  "Espagne",
  "Portugal",
  "Belgique",
  "Pays-Bas",
  "Allemagne",
  "Danemark",
  "Norvège",
  "Suède",
  "Finlande",
  "Estonie",
  "Lettonie",
  "Lituanie",
  "Pologne",
  "Slovaquie",
  "Hongrie",
  "Slovénie",
  "Croatie",
  "Monténégro",
  "Grèce",
];

const EU_PET_PASSPORT_BASICS = [
  "Puce électronique ISO 11784/11785 posée AVANT la vaccination antirabique",
  "Vaccination antirabique valide (au moins 21 jours après une primo-vaccination)",
  "Passeport européen pour animal de compagnie à jour, avec puce et vaccin renseignés",
];

// Traitement antiparasitaire (échinococcose) exigé à l'entrée en Finlande et
// en Norvège : par un vétérinaire, 24 à 120h avant l'arrivée, noté au passeport.
const TAPEWORM_TREATMENT =
  "Traitement antiparasitaire (échinococcose) par un vétérinaire, entre 24h et 120h avant l'arrivée, noté dans le passeport";

function euChecklist(extra: string[] = []): string[] {
  return [...EU_PET_PASSPORT_BASICS, ...extra];
}

/** Checklist "quoi avoir en main" par pays — voir l'avertissement en tête de fichier. */
export const BORDER_CHECKLIST_BY_COUNTRY: Record<string, string[]> = {
  Espagne: euChecklist(),
  Portugal: euChecklist(),
  Belgique: euChecklist(),
  "Pays-Bas": euChecklist(),
  Allemagne: euChecklist(),
  Danemark: euChecklist(),
  Norvège: euChecklist([TAPEWORM_TREATMENT]),
  Suède: euChecklist(),
  Finlande: euChecklist([TAPEWORM_TREATMENT]),
  Estonie: euChecklist(),
  Lettonie: euChecklist(),
  Lituanie: euChecklist(),
  Pologne: euChecklist(),
  Slovaquie: euChecklist(),
  Hongrie: euChecklist(),
  Slovénie: euChecklist(),
  Croatie: euChecklist(),
  Grèce: euChecklist(),
  // Monténégro : hors UE/EEE, régime différent (certificat sanitaire plutôt
  // que passeport, pas de contrôle systématique aux frontières UE internes).
  Monténégro: [
    "Puce électronique ISO 11784/11785 posée AVANT la vaccination antirabique",
    "Vaccination antirabique valide (au moins 21 jours)",
    "Certificat sanitaire (health certificate) émis dans les 10 jours avant le départ",
    "Test sérologique antirabique (titrage) — à vérifier selon le pays de provenance juste avant l'entrée",
  ],
};

/**
 * Vérifie grossièrement si un pays de la liste apparaît dans le nom d'une
 * étape du module Carte (ex. "Porto, Portugal") — sert uniquement à mettre
 * en avant les pays déjà présents sur l'itinéraire réel, la présélection
 * complète reste toujours les 19 pays ci-dessus.
 */
export function guessVisitedCountries(stops: Stop[]): Set<string> {
  const visited = new Set<string>();
  for (const stop of stops) {
    const lowerName = stop.name.toLowerCase();
    for (const country of LOKI_COUNTRIES) {
      if (lowerName.includes(country.toLowerCase())) {
        visited.add(country);
      }
    }
  }
  return visited;
}
