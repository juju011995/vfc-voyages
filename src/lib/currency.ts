// Conversion multi-devises — taux de change en temps réel via l'API
// gratuite frankfurter.app (sans clé, taux de référence BCE, mise à jour un
// jour ouvré sur deux). Nécessite le réseau : les taux sont mis en cache en
// IndexedDB et réutilisés (avec avertissement) si le réseau est indisponible.

import { getExchangeRates, saveExchangeRates } from "./db";
import type { ExchangeRates } from "./types";

const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=EUR";
const MAX_CACHE_AGE_MS = 12 * 60 * 60 * 1000; // 12h

/** Devises couramment utilisées sur l'itinéraire (+ EUR). Liste non exhaustive. */
export const COMMON_CURRENCIES = [
  "EUR",
  "NOK",
  "SEK",
  "DKK",
  "PLN",
  "HUF",
  "GBP",
  "CHF",
];

async function fetchLatestRates(): Promise<ExchangeRates> {
  const response = await fetch(RATES_URL);
  if (!response.ok) {
    throw new Error(`Taux de change indisponibles (${response.status})`);
  }
  const data: { base: string; rates: Record<string, number> } =
    await response.json();
  return {
    base: "EUR",
    rates: { ...data.rates, EUR: 1 },
    fetchedAt: Date.now(),
  };
}

export interface RatesResult {
  rates: ExchangeRates;
  /** true si on retombe sur un taux en cache (réseau indisponible ou hors-ligne). */
  stale: boolean;
}

/** Récupère les taux les plus frais possibles, avec repli sur le cache local. */
export async function getRates(): Promise<RatesResult> {
  const cached = await getExchangeRates();
  const cacheIsFresh =
    cached && Date.now() - cached.fetchedAt < MAX_CACHE_AGE_MS;

  if (cacheIsFresh) {
    return { rates: cached, stale: false };
  }

  try {
    const fresh = await fetchLatestRates();
    await saveExchangeRates(fresh);
    return { rates: fresh, stale: false };
  } catch {
    if (cached) return { rates: cached, stale: true };
    throw new Error(
      "Taux de change indisponibles (hors-ligne et aucun taux en cache).",
    );
  }
}

/** Convertit un montant d'une devise donnée vers l'euro. */
export function convertToEur(
  amount: number,
  currency: string,
  rates: ExchangeRates,
): number {
  if (currency === "EUR") return amount;
  const rate = rates.rates[currency];
  if (!rate) {
    throw new Error(`Taux de change inconnu pour ${currency}.`);
  }
  return amount / rate;
}
