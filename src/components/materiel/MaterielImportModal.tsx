import { useMemo, useRef, useState } from "react";
import type { MaterielCategory, MaterielItem } from "../../lib/types";
import {
  buildImportPayload,
  MaterielImportFormatError,
  parseMaterielImportPreview,
  summarizeSelectedRows,
  type ImportPreviewRow,
  type MaterielImportPreview,
} from "../../lib/materielImport";
import { importMaterielItems } from "../../lib/db";
import { pickNextTagColor } from "../../lib/tagColors";
import { MATERIEL_STATUS_LABELS } from "../../lib/materielCalc";
import "./MaterielImportModal.css";

const EXAMPLE_CSV =
  "categorie;nom;quantite;statut_achat;note\n" +
  "Cuisine;Casseroles;2;À acheter;\n" +
  "Cuisine;Briquet;1;Déjà possédé;\n" +
  "Loki;Antihistaminique;1;À acheter;à demander au véto";

export interface MaterielImportResult {
  addedCount: number;
  ignoredCount: number;
  newCategoriesCount: number;
  createdItemIds: string[];
  createdCategoryIds: string[];
}

interface MaterielImportModalProps {
  existingItems: MaterielItem[];
  existingCategories: MaterielCategory[];
  onClose: () => void;
  onImported: (result: MaterielImportResult) => void;
}

type Step = "input" | "preview";

export function MaterielImportModal({
  existingItems,
  existingCategories,
  onClose,
  onImported,
}: MaterielImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MaterielImportPreview | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setRawText(text);
  }

  function handleBuildPreview() {
    setFormatError(null);
    try {
      const result = parseMaterielImportPreview(rawText, existingItems, existingCategories);
      setPreview(result);
      setRows(result.rows);
      setStep("preview");
    } catch (err) {
      if (err instanceof MaterielImportFormatError) {
        setFormatError(err.message);
      } else {
        setFormatError("Impossible de lire ce fichier.");
      }
    }
  }

  function toggleRowSelected(line: number) {
    setRows((prev) => prev.map((r) => (r.line === line ? { ...r, selected: !r.selected } : r)));
  }

  const summary = useMemo(() => summarizeSelectedRows(rows), [rows]);

  async function handleConfirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const previewWithSelection: MaterielImportPreview = { ...preview, rows };
      const existingColors = existingCategories.map((c) => c.color);
      const payload = buildImportPayload(previewWithSelection, pickNextTagColor, existingColors);
      await importMaterielItems(payload.items, payload.categories);
      const ignoredCount = rows.filter((r) => !r.selected).length;
      onImported({
        addedCount: payload.items.length,
        ignoredCount,
        newCategoriesCount: payload.categories.length,
        createdItemIds: payload.items.map((i) => i.id),
        createdCategoryIds: payload.categories.map((c) => c.id),
      });
    } finally {
      setImporting(false);
    }
  }

  const duplicates = rows.filter((r) => r.duplicate);
  const selectableCount = rows.length;

  return (
    <div className="materiel-import-modal__backdrop">
      <div
        className="materiel-import-modal"
        role="dialog"
        aria-label="Importer une liste d'objets Matériel"
      >
        <div className="materiel-import-modal__header">
          <h3>Importer une liste</h3>
          <button
            type="button"
            className="materiel-import-modal__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {step === "input" && (
          <div className="materiel-import-modal__body">
            <p className="materiel-import-modal__notice">
              Pense à exporter une sauvegarde dans Paramètres avant d'importer.
            </p>

            <div className="materiel-import-modal__help">
              <p>
                Fichier CSV (ou texte collé), première ligne = en-têtes, séparateur « ; » (« , »
                et tabulation aussi acceptés). Colonnes : <code>categorie</code>, <code>nom</code>{" "}
                (obligatoires), <code>quantite</code>, <code>statut_achat</code>, <code>note</code>
                , <code>prix</code> (facultatives). Exemple :
              </p>
              <pre className="materiel-import-modal__example">{EXAMPLE_CSV}</pre>
            </div>

            <div className="materiel-import-modal__field">
              <span>Fichier .csv ou .txt</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={handleFileChange}
                hidden
              />
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                {fileName ? `Fichier choisi : ${fileName}` : "Choisir un fichier…"}
              </button>
            </div>

            <div className="materiel-import-modal__field">
              <span>Ou coller le texte ici</span>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setFileName(null);
                }}
                rows={8}
                placeholder={EXAMPLE_CSV}
              />
            </div>

            {formatError && <p className="materiel-import-modal__error">{formatError}</p>}

            <div className="materiel-import-modal__actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!rawText.trim()}
                onClick={handleBuildPreview}
              >
                Voir l'aperçu
              </button>
            </div>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="materiel-import-modal__body">
            <div className="materiel-import-modal__summary">
              <p className="materiel-import-modal__summary-total">
                {summary.totalSelected} objet(s) seront ajoutés
              </p>
              {summary.byCategory.length > 0 && (
                <p className="materiel-import-modal__summary-detail">
                  Par catégorie :{" "}
                  {summary.byCategory.map((c) => `${c.categoryName} (${c.count})`).join(" · ")}
                </p>
              )}
              {summary.byStatus.length > 0 && (
                <p className="materiel-import-modal__summary-detail">
                  Par statut :{" "}
                  {summary.byStatus
                    .map((s) => `${MATERIEL_STATUS_LABELS[s.status]} (${s.count})`)
                    .join(" · ")}
                </p>
              )}
            </div>

            {preview.newCategories.length > 0 && (
              <div className="materiel-import-modal__section materiel-import-modal__section--new-category">
                <h4>Nouvelles catégories créées</h4>
                <ul>
                  {preview.newCategories.map((c) => (
                    <li key={c.id}>{c.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="materiel-import-modal__section materiel-import-modal__section--duplicate">
                <h4>Doublons détectés ({duplicates.length}) — décochés par défaut</h4>
                <ul>
                  {duplicates.map((r) => (
                    <li key={r.line}>
                      <label>
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={() => toggleRowSelected(r.line)}
                        />
                        <span>
                          {r.name} ({r.categoryName}) —{" "}
                          {r.duplicate === "existing"
                            ? "déjà dans le Matériel"
                            : "en double dans le fichier"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.errors.length > 0 && (
              <div className="materiel-import-modal__section materiel-import-modal__section--error">
                <h4>Lignes en erreur, non importées ({preview.errors.length})</h4>
                <ul>
                  {preview.errors.map((e) => (
                    <li key={e.line}>
                      Ligne {e.line} : {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.warnings.length > 0 && (
              <div className="materiel-import-modal__section materiel-import-modal__section--warning">
                <h4>Avertissements</h4>
                <ul>
                  {preview.warnings.map((w, idx) => (
                    <li key={idx}>
                      Ligne {w.line} : {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectableCount === 0 && preview.errors.length > 0 && (
              <p className="materiel-import-modal__error">
                Aucune ligne valide à importer — corrige le fichier et recommence.
              </p>
            )}

            <div className="materiel-import-modal__actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setStep("input")}
                disabled={importing}
              >
                Retour
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={importing || summary.totalSelected === 0}
                onClick={handleConfirmImport}
              >
                {importing ? "Import…" : `Importer (${summary.totalSelected})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
