import type { LokiDocument } from "../../lib/types";
import "./DocumentList.css";

interface DocumentListProps {
  documents: LokiDocument[];
  onEdit: (doc: LokiDocument) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DocumentList({ documents, onEdit }: DocumentListProps) {
  if (documents.length === 0) {
    return <p className="document-list__empty">Aucun document ou vaccin enregistré.</p>;
  }

  const today = todayIso();

  return (
    <ul className="document-list">
      {documents.map((doc) => {
        const overdue = Boolean(doc.dueDate && doc.dueDate < today);
        return (
          <li key={doc.id} className="document-list__row">
            <button type="button" className="document-list__main" onClick={() => onEdit(doc)}>
              <span
                className={
                  "document-list__type" +
                  (doc.type === "vaccin" ? " document-list__type--vaccin" : "")
                }
              >
                {doc.type === "vaccin" ? "Vaccin" : "Document"}
              </span>
              <span className="document-list__info">
                <span className="document-list__title">{doc.title}</span>
                {doc.dueDate ? (
                  <span
                    className={
                      "document-list__due" + (overdue ? " document-list__due--overdue" : "")
                    }
                  >
                    {overdue ? "Échéance dépassée · " : "Échéance "}
                    {formatDate(doc.dueDate)}
                  </span>
                ) : doc.date ? (
                  <span className="document-list__due">Obtenu le {formatDate(doc.date)}</span>
                ) : null}
              </span>
              {doc.driveLink && (
                <span className="document-list__link-icon" aria-label="Lien Drive attaché">
                  ↗
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
