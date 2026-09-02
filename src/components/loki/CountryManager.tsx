import { useState, type FormEvent } from "react";
import { LOKI_COUNTRIES } from "../../lib/lokiData";
import "./CountryManager.css";

interface CountryManagerProps {
  /** Pays affichés, triés — union des pays détectés sur la Carte et des ajouts manuels, moins les retraits manuels. */
  visibleCountries: string[];
  /** Pays détectés depuis les étapes du module Carte — sert seulement à distinguer l'origine dans l'affichage (badge "Carte"). */
  detectedCountries: Set<string>;
  onAddCountry: (country: string) => void;
  onRemoveCountry: (country: string) => void;
}

export function CountryManager({
  visibleCountries,
  detectedCountries,
  onAddCountry,
  onRemoveCountry,
}: CountryManagerProps) {
  const [input, setInput] = useState("");

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddCountry(trimmed);
    setInput("");
  }

  return (
    <div className="country-manager">
      <div className="country-manager__chips">
        {visibleCountries.length === 0 && (
          <p className="country-manager__empty">
            Aucun pays pour l'instant — ajoute une étape dans la Carte ou un pays ici.
          </p>
        )}
        {visibleCountries.map((country) => (
          <span key={country} className="country-manager__chip">
            {country}
            {detectedCountries.has(country) && (
              <span className="country-manager__chip-badge" title="Détecté depuis la Carte">
                Carte
              </span>
            )}
            <button
              type="button"
              className="country-manager__chip-remove"
              onClick={() => onRemoveCountry(country)}
              aria-label={`Retirer ${country} de la liste`}
              title="Retirer de la liste (les données saisies sont conservées)"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form className="country-manager__add" onSubmit={handleAdd}>
        <input
          type="text"
          list="country-manager-suggestions"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ajouter un pays…"
        />
        <datalist id="country-manager-suggestions">
          {LOKI_COUNTRIES.filter((c) => !visibleCountries.includes(c)).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button type="submit" className="btn btn--secondary" disabled={!input.trim()}>
          + Ajouter
        </button>
      </form>
    </div>
  );
}
