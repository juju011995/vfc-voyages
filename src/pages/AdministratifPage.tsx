import { useEffect, useMemo, useState } from "react";
import {
  deleteAdminDocument,
  listAdminDocuments,
  listTaskTags,
  listTasks,
  saveAdminDocument,
} from "../lib/db";
import { getTasksByTagName } from "../lib/taskCalc";
import type { AdminDocument, Task, TaskTag } from "../lib/types";
import { useTheme } from "../theme/ThemeProvider";
import { getPalette } from "../theme/palette";
import { AdminDocumentList } from "../components/administratif/AdminDocumentList";
import { AdminDocumentEditor } from "../components/administratif/AdminDocumentEditor";
import { AdminTaskList } from "../components/administratif/AdminTaskList";
import "./AdministratifPage.css";

type SubTab = "documents" | "taches";

interface AdministratifPageProps {
  onOpenTaches: () => void;
}

export function AdministratifPage({ onOpenTaches }: AdministratifPageProps) {
  const { resolvedTheme } = useTheme();
  const palette = getPalette(resolvedTheme);

  const [subTab, setSubTab] = useState<SubTab>("documents");
  const [loaded, setLoaded] = useState(false);

  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);

  const [editingDocumentId, setEditingDocumentId] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const [docs, allTasks, tags] = await Promise.all([
        listAdminDocuments(),
        listTasks(),
        listTaskTags(),
      ]);
      setDocuments(docs);
      setTasks(allTasks);
      setTaskTags(tags);
      setLoaded(true);
    })();
  }, []);

  const adminTag = taskTags.find((t) => t.name.trim().toLowerCase() === "administratif");
  const adminTasks = useMemo(
    () => getTasksByTagName(tasks, taskTags, "Administratif"),
    [tasks, taskTags],
  );

  const editingDocument = documents.find((d) => d.id === editingDocumentId);

  // -- Documents --------------------------------------------------------
  async function handleAddDocument() {
    const now = Date.now();
    const doc: AdminDocument = {
      id: crypto.randomUUID(),
      title: "",
      person: "both",
      createdAt: now,
      updatedAt: now,
    };
    await saveAdminDocument(doc);
    setDocuments((prev) => [...prev, doc]);
    setEditingDocumentId(doc.id);
  }

  async function handleSaveDocument(updates: Partial<AdminDocument>) {
    if (!editingDocumentId) return;
    setDocuments((prev) => {
      const next = prev.map((d) =>
        d.id === editingDocumentId ? { ...d, ...updates, updatedAt: Date.now() } : d,
      );
      const updated = next.find((d) => d.id === editingDocumentId);
      if (updated) saveAdminDocument(updated);
      return next;
    });
  }

  async function handleDeleteDocument(id: string) {
    await deleteAdminDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setEditingDocumentId((current) => (current === id ? undefined : current));
  }

  function handleCloseDocumentEditor() {
    const doc = documents.find((d) => d.id === editingDocumentId);
    if (doc && !doc.title.trim()) {
      handleDeleteDocument(doc.id);
    } else {
      setEditingDocumentId(undefined);
    }
  }

  if (!loaded) {
    return <p className="administratif-page__loading">Chargement…</p>;
  }

  return (
    <div className="administratif-page">
      <h2 className="administratif-page__heading">Administratif</h2>

      <div className="administratif-page__toolbar" role="tablist" aria-label="Sections Administratif">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "documents"}
          className={subTab === "documents" ? "is-active" : ""}
          onClick={() => setSubTab("documents")}
        >
          Documents
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "taches"}
          className={subTab === "taches" ? "is-active" : ""}
          onClick={() => setSubTab("taches")}
        >
          Tâches
        </button>
      </div>

      {subTab === "documents" && (
        <div className="administratif-page__section">
          <div className="administratif-page__section-header">
            <h3>Documents &amp; échéances</h3>
            <button type="button" className="btn btn--primary" onClick={handleAddDocument}>
              + Ajouter
            </button>
          </div>
          <AdminDocumentList
            documents={documents}
            palette={palette}
            onEdit={(d) => setEditingDocumentId(d.id)}
          />

          {editingDocument && (
            <div className="administratif-page__editor-overlay">
              <AdminDocumentEditor
                document={editingDocument}
                palette={palette}
                onClose={handleCloseDocumentEditor}
                onSave={handleSaveDocument}
                onDelete={handleDeleteDocument}
              />
            </div>
          )}
        </div>
      )}

      {subTab === "taches" && (
        <div className="administratif-page__section">
          <AdminTaskList
            tasks={adminTasks}
            adminTag={adminTag}
            palette={palette}
            onOpenTaches={onOpenTaches}
          />
        </div>
      )}
    </div>
  );
}
