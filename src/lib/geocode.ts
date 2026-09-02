// Géocodage — recherche de destination via Nominatim (OpenStreetMap).
// API publique gratuite, sans clé. On respecte sa politique d'usage :
// User-Agent explicite, pas d'appel à chaque frappe (debounce côté appelant),
// résultats limités.

export interface GeocodeResult {
  id: string;
  displayName: string;
  lat: number;
  lng: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function searchPlace(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Recherche indisponible (${response.status}). Vérifie ta connexion.`,
    );
  }

  const data: Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }> = await response.json();

  return data.map((item) => ({
    id: String(item.place_id),
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}
