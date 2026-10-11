// Import en masse d'objets Matériel depuis un CSV (ou texte collé) —
// aucune donnée utilisateur n'est codée en dur ici : tout vient du fichier
// fourni par l'utilisatrice au moment de l'import. Logique entièrement pure
// (pas d'accès à Firestore) pour pouvoir être testée indépendamment — voir
// materielImportExecute() dans db.ts pour l'écriture effective.

import type { MaterielCategory, MaterielEmbarkmentStatus, MaterielItem, MaterielItemStatus } from "./types";

// -- Normalisation (tolérance accents/casse/espaces) -------------------------

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Clé de comparaison tolérante : sans accents, en minuscules, espaces multiples réduits, bords coupés. */
export function normalizeKey(s: string): string {
  return stripAccents(s).toLowerCase().trim().replace(/\s+/g, " ");
}

const STATUS_BY_NORMALIZED_LABEL: Record<string, MaterielItemStatus> = {
  "a acheter": "a-acheter",
  "en cours": "en-cours",
  achete: "achete",
  "deja possede": "deja-possede",
};

const REQUIRED_COLUMNS = ["categorie", "nom"] as const;
const KNOWN_COLUMNS = ["categorie", "nom", "quantite", "statut_achat", "note", "prix"] as const;

// -- Lecture CSV tolérante ----------------------------------------------------

function detectDelimiter(headerLine: string): string {
  const candidates = [";", ",", "\t"];
  let best = ";";
  let bestCount = -1;
  for (const d of candidates) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** Découpe une ligne CSV en champs, en gérant les guillemets (et les guillemets doublés "" à l'intérieur d'un champ). */
function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function parseQuantity(raw: string): { value: number; invalid: boolean } {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: 1, invalid: true };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return { value: 1, invalid: true };
  return { value: n, invalid: false };
}

function parsePrice(raw: string): { value?: number; invalid: boolean } {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: undefined, invalid: false };
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n)) return { value: undefined, invalid: true };
  return { value: n, invalid: false };
}

// -- Résultat de lecture -------------------------------------------------------

export interface ImportRowError {
  line: number;
  raw: string;
  reason: string;
}

export interface ImportRowWarning {
  line: number;
  message: string;
}

export type ImportDuplicateKind = "existing" | "in-file";

export interface ImportPreviewRow {
  line: number;
  name: string;
  categoryName: string;
  categoryId: string;
  isNewCategory: boolean;
  quantity: number;
  status: MaterielItemStatus;
  note?: string;
  priceEUR?: number;
  duplicate?: ImportDuplicateKind;
  /** Sélection par défaut : décochée pour les doublons, cochée sinon — modifiable ensuite par l'utilisatrice dans l'aperçu. */
  selected: boolean;
}

export interface NewCategoryToCreate {
  id: string;
  name: string;
}

export interface MaterielImportPreview {
  rows: ImportPreviewRow[];
  errors: ImportRowError[];
  warnings: ImportRowWarning[];
  newCategories: NewCategoryToCreate[];
}

/** Erreur de format globale (en-têtes manquantes) — distincte des erreurs ligne par ligne, qui n'empêchent pas le reste de l'import. */
export class MaterielImportFormatError extends Error {}

/**
 * Lit un CSV (ou texte collé au même format) et produit un aperçu complet :
 * lignes valides (avec détection des doublons), erreurs de ligne, avertissements,
 * et catégories qui seraient créées. N'écrit rien — voir buildImportPayload().
 */
export function parseMaterielImportPreview(
  rawText: string,
  existingItems: MaterielItem[],
  existingCategories: MaterielCategory[],
): MaterielImportPreview {
  const text = rawText.replace(/^﻿/, "");
  const allLines = text.split(/\r\n|\r|\n/);

  // Numéro de ligne d'origine (1-based, en-tête compris) conservé pour les
  // messages d'erreur, même si les lignes vides sont ignorées silencieusement.
  const nonEmptyLines: Array<{ line: number; text: string }> = [];
  allLines.forEach((text, idx) => {
    if (text.trim() !== "") nonEmptyLines.push({ line: idx + 1, text });
  });

  if (nonEmptyLines.length === 0) {
    throw new MaterielImportFormatError("Le fichier est vide.");
  }

  const delimiter = detectDelimiter(nonEmptyLines[0].text);
  const headerCells = splitCsvLine(nonEmptyLines[0].text, delimiter).map(normalizeKey);
  const columnIndex = new Map<string, number>();
  headerCells.forEach((cell, idx) => {
    if ((KNOWN_COLUMNS as readonly string[]).includes(cell)) columnIndex.set(cell, idx);
  });

  const missing = REQUIRED_COLUMNS.filter((c) => !columnIndex.has(c));
  if (missing.length > 0) {
    throw new MaterielImportFormatError(
      `Colonne(s) obligatoire(s) manquante(s) dans l'en-tête : ${missing.join(", ")}.`,
    );
  }

  function cell(fields: string[], column: string): string {
    const idx = columnIndex.get(column);
    return idx !== undefined ? fields[idx] ?? "" : "";
  }

  const existingCategoryByNormalizedName = new Map<string, MaterielCategory>();
  for (const c of existingCategories) {
    existingCategoryByNormalizedName.set(normalizeKey(c.name), c);
  }

  const newCategories: NewCategoryToCreate[] = [];
  const newCategoryByNormalizedName = new Map<string, NewCategoryToCreate>();

  const existingItemKeys = new Set(
    existingItems.map((i) => `${normalizeKey(i.name)}::${i.categoryId}`),
  );
  const seenInFileKeys = new Set<string>();

  const rows: ImportPreviewRow[] = [];
  const errors: ImportRowError[] = [];
  const warnings: ImportRowWarning[] = [];

  for (const { line, text: lineText } of nonEmptyLines.slice(1)) {
    const fields = splitCsvLine(lineText, delimiter);

    const categoryNameRaw = cell(fields, "categorie").trim();
    const nameRaw = cell(fields, "nom").trim();

    if (!categoryNameRaw || !nameRaw) {
      errors.push({
        line,
        raw: lineText,
        reason: !nameRaw && !categoryNameRaw
          ? "catégorie et nom manquants"
          : !nameRaw
            ? "nom manquant"
            : "catégorie manquante",
      });
      continue;
    }

    const statusRaw = cell(fields, "statut_achat").trim();
    let status: MaterielItemStatus;
    if (statusRaw === "") {
      status = "a-acheter";
    } else {
      const matched = STATUS_BY_NORMALIZED_LABEL[normalizeKey(statusRaw)];
      if (!matched) {
        errors.push({ line, raw: lineText, reason: `statut d'achat inconnu : « ${statusRaw} »` });
        continue;
      }
      status = matched;
    }

    const { value: quantity, invalid: quantityInvalid } = parseQuantity(cell(fields, "quantite"));
    if (quantityInvalid) {
      warnings.push({ line, message: `quantité absente ou invalide pour « ${nameRaw} » — 1 utilisé par défaut` });
    }

    const { value: priceEUR, invalid: priceInvalid } = parsePrice(cell(fields, "prix"));
    if (priceInvalid) {
      warnings.push({ line, message: `prix illisible pour « ${nameRaw} » — ignoré` });
    }

    const note = cell(fields, "note").trim() || undefined;

    // Résolution de catégorie : existante (comparaison tolérante) sinon
    // nouvelle (une seule fois par nom, même nouvelle catégorie réutilisée
    // par toutes les lignes suivantes qui la citent).
    const normalizedCategoryName = normalizeKey(categoryNameRaw);
    let categoryId: string;
    let isNewCategory: boolean;
    const existingCategory = existingCategoryByNormalizedName.get(normalizedCategoryName);
    if (existingCategory) {
      categoryId = existingCategory.id;
      isNewCategory = false;
    } else {
      const alreadyQueued = newCategoryByNormalizedName.get(normalizedCategoryName);
      if (alreadyQueued) {
        categoryId = alreadyQueued.id;
      } else {
        const created: NewCategoryToCreate = { id: crypto.randomUUID(), name: categoryNameRaw };
        newCategoryByNormalizedName.set(normalizedCategoryName, created);
        newCategories.push(created);
        categoryId = created.id;
      }
      isNewCategory = true;
    }

    const dedupeKey = `${normalizeKey(nameRaw)}::${categoryId}`;
    let duplicate: ImportDuplicateKind | undefined;
    if (existingItemKeys.has(dedupeKey)) {
      duplicate = "existing";
    } else if (seenInFileKeys.has(dedupeKey)) {
      duplicate = "in-file";
    } else {
      seenInFileKeys.add(dedupeKey);
    }

    rows.push({
      line,
      name: nameRaw,
      categoryName: categoryNameRaw,
      categoryId,
      isNewCategory,
      quantity,
      status,
      note,
      priceEUR,
      duplicate,
      selected: !duplicate,
    });
  }

  return { rows, errors, warnings, newCategories };
}

// -- Résumé réactif (dépend de la sélection courante dans l'aperçu) ----------

export interface MaterielImportSummary {
  totalSelected: number;
  byCategory: Array<{ categoryName: string; count: number }>;
  byStatus: Array<{ status: MaterielItemStatus; count: number }>;
}

export function summarizeSelectedRows(rows: ImportPreviewRow[]): MaterielImportSummary {
  const selected = rows.filter((r) => r.selected);
  const byCategory = new Map<string, number>();
  const byStatus = new Map<MaterielItemStatus, number>();
  for (const r of selected) {
    byCategory.set(r.categoryName, (byCategory.get(r.categoryName) ?? 0) + 1);
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  }
  return {
    totalSelected: selected.length,
    byCategory: [...byCategory.entries()].map(([categoryName, count]) => ({ categoryName, count })),
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
  };
}

// -- Construction des objets à écrire ----------------------------------------

function initialEmbarkmentStatus(status: MaterielItemStatus): MaterielEmbarkmentStatus {
  return status === "achete" || status === "deja-possede" ? "possede" : "a-prendre";
}

export interface MaterielImportPayload {
  items: MaterielItem[];
  categories: MaterielCategory[];
}

/**
 * Construit les MaterielItem/MaterielCategory réels à écrire, à partir des
 * lignes sélectionnées par l'utilisatrice dans l'aperçu — seules les
 * catégories effectivement utilisées par au moins une ligne sélectionnée
 * sont créées (une ligne en doublon décochée ne crée pas sa catégorie si
 * elle est la seule à la référencer).
 */
export function buildImportPayload(
  preview: MaterielImportPreview,
  pickCategoryColor: (usedColors: Array<string | undefined>) => string,
  existingCategoryColors: Array<string | undefined>,
): MaterielImportPayload {
  const selectedRows = preview.rows.filter((r) => r.selected);
  const usedNewCategoryIds = new Set(
    selectedRows.filter((r) => r.isNewCategory).map((r) => r.categoryId),
  );

  const usedColors = [...existingCategoryColors];
  const categories: MaterielCategory[] = [];
  for (const nc of preview.newCategories) {
    if (!usedNewCategoryIds.has(nc.id)) continue;
    const color = pickCategoryColor(usedColors);
    usedColors.push(color);
    categories.push({
      id: nc.id,
      name: nc.name,
      isDefault: false,
      color,
      createdAt: Date.now(),
    });
  }

  const baseNow = Date.now();
  const items: MaterielItem[] = selectedRows.map((row, index) => ({
    id: crypto.randomUUID(),
    name: row.name,
    categoryId: row.categoryId,
    quantity: row.quantity,
    status: row.status,
    priceEUR: row.priceEUR,
    notes: row.note,
    embarkmentStatus: initialEmbarkmentStatus(row.status),
    createdAt: baseNow + index,
    updatedAt: baseNow + index,
  }));

  return { items, categories };
}
