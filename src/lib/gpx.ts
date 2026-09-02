// Import GPX — parse un fichier exporté depuis Polarsteps côté client
// (aucun envoi réseau) pour l'afficher en superposition sur la carte.

import type { GpxPoint } from "./types";

export function parseGpx(xmlText: string): GpxPoint[] {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Fichier GPX invalide ou corrompu.");
  }

  // Un export Polarsteps est une trace (trkpt) ; on gère aussi les waypoints
  // (wpt) au cas où le fichier n'en contiendrait que.
  const pointNodes = Array.from(doc.getElementsByTagName("trkpt"));
  const nodes =
    pointNodes.length > 0
      ? pointNodes
      : Array.from(doc.getElementsByTagName("wpt"));

  if (nodes.length === 0) {
    throw new Error("Aucun point trouvé dans ce fichier GPX.");
  }

  const points: GpxPoint[] = nodes.map((node) => {
    const lat = parseFloat(node.getAttribute("lat") ?? "NaN");
    const lng = parseFloat(node.getAttribute("lon") ?? "NaN");
    const eleNode = node.getElementsByTagName("ele")[0];
    const timeNode = node.getElementsByTagName("time")[0];
    return {
      lat,
      lng,
      ele: eleNode ? parseFloat(eleNode.textContent ?? "") : undefined,
      time: timeNode?.textContent ?? undefined,
    };
  });

  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );

  if (valid.length === 0) {
    throw new Error("Les points de ce fichier GPX sont illisibles.");
  }

  return valid;
}

export function readGpxFile(file: File): Promise<GpxPoint[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseGpx(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsText(file);
  });
}
