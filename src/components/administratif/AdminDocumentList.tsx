import type { AdminDocument } from "../../lib/types";
import type { Palette } from "../../theme/palette";
import { PersonBadge } from "../shared/PersonBadge";
import "./AdminDocumentList.css";

interface AdminDocumentListProps {
  documents: AdminDocument[];
  palette: Palette;
  onEdit: (doc: AdminDocument) => void;
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

export function AdminDocumentList({ documents, palette, onEdit }: AdminDocumentListProps) {
  if (documents.length === 0) {
    return <p className="admin-document-list__empty">Aucun document enregistré.</p>;
  }

  const today = todayIso();

  return (
    <ul className="admin-document-list">
      {documents.map((doc) => {
        const overdue = Boolean(doc.expiryDate && doc.expiryDate < today);
        return (
          <li key={doc.id} className="admin-document-list__row">
            <button
              type="button"
              className="admin-document-list__main"
              onClick={() => onEdit(doc)}
            >
              <PersonBadge payer={doc.person} palette={palette} size={22} />
              <span className="admin-document-list__info">
                <span className="admin-document-list__title">{doc.title}</span>
                {doc.expiryDate ? (
                  <span
                    className={
                      "admin-document-list__due" +
                      (overdue ? " admin-document-list__due--overdue" : "")
                    }
                  >
                    {overdue ? "Expiré depuis le " : "Expire le "}
                    {formatDate(doc.expiryDate)}
                  </span>
                ) : (
                  <span className="admin-document-list__due">Aucune échéance renseignée</span>
                )}
              </span>
              {doc.driveLink && (
                <span className="admin-document-list__link-icon" aria-label="Lien Drive attaché">
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
