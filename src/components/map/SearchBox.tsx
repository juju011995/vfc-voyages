import { useEffect, useRef, useState } from "react";
import { searchPlace, type GeocodeResult } from "../../lib/geocode";
import "./SearchBox.css";

interface SearchBoxProps {
  onPick: (result: GeocodeResult) => void;
}

export function SearchBox({ onPick }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const found = await searchPlace(query, controller.signal);
        setResults(found);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(
            navigator.onLine
              ? "Recherche indisponible pour le moment."
              : "Hors-ligne : la recherche nécessite une connexion.",
          );
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  function handlePick(result: GeocodeResult) {
    onPick(result);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="search-box">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher une étape…"
        aria-label="Rechercher une destination"
      />
      {loading && <span className="search-box__spinner" aria-hidden="true" />}

      {open && (error || results.length > 0) && (
        <ul className="search-box__results">
          {error && <li className="search-box__error">{error}</li>}
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" onClick={() => handlePick(result)}>
                {result.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
