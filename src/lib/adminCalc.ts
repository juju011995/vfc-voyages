// Calculs du module Administratif — prochaine échéance de document (pour le Dashboard).

import type { AdminDocument } from "./types";

export interface UpcomingAdminDeadline {
  id: string;
  title: string;
  person: AdminDocument["person"];
  expiryDate: string;
  overdue: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Prochaines échéances de documents administratifs (expirations), triées par date. */
export function getUpcomingAdminDeadlines(
  documents: AdminDocument[],
  limit = 5,
): UpcomingAdminDeadline[] {
  const today = todayIso();

  return documents
    .filter((d) => d.expiryDate)
    .map((d) => ({
      id: d.id,
      title: d.title,
      person: d.person,
      expiryDate: d.expiryDate!,
      overdue: d.expiryDate! < today,
    }))
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    .slice(0, limit);
}
