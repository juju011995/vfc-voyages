import { useRef, useState, type ChangeEvent } from "react";
import { readGpxFile } from "../../lib/gpx";
import type { GpxTrack } from "../../lib/types";
import "./GpxImport.css";

interface GpxImportProps {
  currentTrack?: GpxTrack;
  onImported: (track: GpxTrack) => void;
  onClear: () => void;
}

export function GpxImport({ currentTrack, onImported, onClear }: GpxImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const points = await readGpxFile(file);
      onImported({
        id: crypto.randomUUID(),
        fileName: file.name,
        points,
        importedAt: Date.now(),
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gpx-import">
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        onChange={handleFileChange}
        hidden
      />
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Import…" : "Importer un GPX Polarsteps"}
      </button>

      {currentTrack && (
        <div className="gpx-import__current">
          <span>
            {currentTrack.fileName} · {currentTrack.points.length} points
          </span>
          <button type="button" onClick={onClear} aria-label="Retirer le tracé GPX">
            ×
          </button>
        </div>
      )}

      {error && <p className="gpx-import__error">{error}</p>}
    </div>
  );
}
