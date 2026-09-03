// Données de référence pour la présélection du module Loki — pays de
// l'itinéraire (cahier des charges §8) et checklist frontalière par pays.
//
// ⚠️ Premier jet basé sur la réglementation UE de circulation des animaux de
// compagnie (règlement 576/2013, passeport européen) telle que documentée en
// septembre 2026, vérifiée par recherche web au moment de la construction de
// ce module — PAS une source juridique. Les règles changent : chaque fiche
// pré-remplie reste marquée « à vérifier avant le départ » dans l'interface,
// conformément au cahier des charges.

import type { LokiCountrySettings, Stop } from "./types";

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

export const EU_PET_PASSPORT_BASICS = [
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

/** Checklist pour un pays donné, avec repli sur le socle UE générique si le pays n'est pas dans la liste ci-dessus (ex. ajouté manuellement). */
export function getBorderChecklistFor(country: string): string[] {
  return BORDER_CHECKLIST_BY_COUNTRY[country] ?? EU_PET_PASSPORT_BASICS;
}

/**
 * Pays réellement présents sur l'itinéraire, d'après Stop.country (donnée
 * structurée de Nominatim, fiable). Pour d'anciennes étapes créées avant
 * l'ajout de ce champ, on retombe sur une recherche du nom du pays dans le
 * nom de l'étape (ex. "Porto, Portugal") — best effort, seulement en repli.
 */
export function getDetectedCountries(stops: Stop[]): Set<string> {
  const detected = new Set<string>();
  for (const stop of stops) {
    if (stop.country) {
      detected.add(stop.country);
      continue;
    }
    const lowerName = stop.name.toLowerCase();
    for (const country of LOKI_COUNTRIES) {
      if (lowerName.includes(country.toLowerCase())) {
        detected.add(country);
      }
    }
  }
  return detected;
}

/**
 * Liste des pays à afficher dans les onglets Vétérinaires/Frontières :
 * ceux détectés sur l'itinéraire, plus les ajouts manuels, moins les
 * retraits manuels (qui l'emportent toujours). Ne touche à aucune donnée
 * déjà saisie — seulement à ce qui est affiché.
 */
export function computeVisibleCountries(
  detected: Set<string>,
  settings: LokiCountrySettings,
): string[] {
  const removed = new Set(settings.manuallyRemoved);
  const visible = new Set<string>();
  for (const country of detected) {
    if (!removed.has(country)) visible.add(country);
  }
  for (const country of settings.manuallyAdded) {
    if (!removed.has(country)) visible.add(country);
  }
  return [...visible].sort((a, b) => a.localeCompare(b));
}
